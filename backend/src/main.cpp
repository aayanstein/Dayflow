#include "crow.h"
#include "database.h"
#include <vector>
#include <string>
#include <mutex>
#include <ctime>
#include <iostream>

namespace {
std::string server_today() {
    std::time_t now = std::time(nullptr);
    std::tm* lt = std::localtime(&now);
    char buf[16];
    std::strftime(buf, sizeof(buf), "%Y-%m-%d", lt);
    return std::string(buf);
}

std::string resolve_date(const crow::request& req) {
    const char* q = req.url_params.get("date");
    if (q && std::string(q).size() == 10) {
        return std::string(q);
    }
    return server_today();
}

std::string extract_bearer_token(const crow::request& req) {
    std::string auth = req.get_header_value("Authorization");
    const std::string prefix = "Bearer ";
    if (auth.size() > prefix.size() && auth.compare(0, prefix.size(), prefix) == 0) {
        return auth.substr(prefix.size());
    }
    return "";
}
}

struct CORSMiddleware {
    struct context {};

    void before_handle(crow::request& req, crow::response& res, context&) {
        if (req.method == crow::HTTPMethod::Options) {
            res.add_header("Access-Control-Allow-Origin", "*");
            res.add_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
            res.add_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
            res.code = 204;
            res.end();
        }
    }

    void after_handle(crow::request&, crow::response& res, context&) {
        res.add_header("Access-Control-Allow-Origin", "*");
        res.add_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
        res.add_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
};

int main() {
    Database db("dayflow.db");
    if (!db.is_open() || !db.init_schema()) {
        std::cerr << "Database initialization failed.\n";
        return 1;
    }

    crow::App<CORSMiddleware> app;
    std::mutex mtx;

    auto authenticate = [&](const crow::request& req, User& out_user) -> bool {
        std::string token = extract_bearer_token(req);
        if (token.empty()) return false;
        return db.get_user_by_token(token, out_user);
    };

    CROW_ROUTE(app, "/api/health")([]() {
        crow::json::wvalue res;
        res["status"] = "ok";
        res["app"] = "DAYFLOW";
        res["storage"] = "sqlite";
        return crow::response(200, res);
    });

    // Auth: Register
    CROW_ROUTE(app, "/api/auth/register").methods(crow::HTTPMethod::Post)([&](const crow::request& req) {
        auto body = crow::json::load(req.body);
        if (!body || !body.has("email") || !body.has("password")) {
            return crow::response(400, R"({"error":"email and password are required"})");
        }
        std::string name = (body.has("name") && body["name"].t() == crow::json::type::String) ? std::string(body["name"].s()) : "User";
        std::string email = (body["email"].t() == crow::json::type::String) ? std::string(body["email"].s()) : "";
        std::string password = (body["password"].t() == crow::json::type::String) ? std::string(body["password"].s()) : "";

        std::lock_guard<std::mutex> lock(mtx);
        User user;
        std::string err;
        if (!db.register_user(name, email, password, user, err)) {
            crow::json::wvalue r;
            r["error"] = err;
            return crow::response(400, r);
        }
        std::string token = db.create_session(user.id);
        crow::json::wvalue res;
        res["token"] = token;
        res["user"]["id"] = user.id;
        res["user"]["name"] = user.name;
        res["user"]["email"] = user.email;
        res["user"]["provider"] = user.provider;
        return crow::response(201, res);
    });

    // Auth: Email + Password Login
    CROW_ROUTE(app, "/api/auth/login").methods(crow::HTTPMethod::Post)([&](const crow::request& req) {
        auto body = crow::json::load(req.body);
        if (!body || !body.has("email") || !body.has("password")) {
            return crow::response(400, R"({"error":"email and password are required"})");
        }
        std::string email = (body["email"].t() == crow::json::type::String) ? std::string(body["email"].s()) : "";
        std::string password = (body["password"].t() == crow::json::type::String) ? std::string(body["password"].s()) : "";

        std::lock_guard<std::mutex> lock(mtx);
        User user;
        std::string err;
        if (!db.login_user(email, password, user, err)) {
            crow::json::wvalue r;
            r["error"] = err;
            return crow::response(401, r);
        }
        std::string token = db.create_session(user.id);
        crow::json::wvalue res;
        res["token"] = token;
        res["user"]["id"] = user.id;
        res["user"]["name"] = user.name;
        res["user"]["email"] = user.email;
        res["user"]["provider"] = user.provider;
        return crow::response(200, res);
    });

    // Auth: Google (Gmail) / GitHub / Guest
    CROW_ROUTE(app, "/api/auth/oauth").methods(crow::HTTPMethod::Post)([&](const crow::request& req) {
        auto body = crow::json::load(req.body);
        if (!body || !body.has("provider")) {
            return crow::response(400, R"({"error":"provider is required"})");
        }
        std::string provider = (body["provider"].t() == crow::json::type::String) ? std::string(body["provider"].s()) : "other";
        std::string name = (body.has("name") && body["name"].t() == crow::json::type::String) ? std::string(body["name"].s()) : "";
        std::string email = (body.has("email") && body["email"].t() == crow::json::type::String) ? std::string(body["email"].s()) : "";

        std::lock_guard<std::mutex> lock(mtx);
        User user;
        std::string err;
        if (!db.oauth_login_or_create(provider, name, email, user, err)) {
            crow::json::wvalue r;
            r["error"] = err;
            return crow::response(400, r);
        }
        std::string token = db.create_session(user.id);
        crow::json::wvalue res;
        res["token"] = token;
        res["user"]["id"] = user.id;
        res["user"]["name"] = user.name;
        res["user"]["email"] = user.email;
        res["user"]["provider"] = user.provider;
        return crow::response(200, res);
    });

    // Auth: Current User
    CROW_ROUTE(app, "/api/auth/me").methods(crow::HTTPMethod::Get)([&](const crow::request& req) {
        std::lock_guard<std::mutex> lock(mtx);
        User user;
        if (!authenticate(req, user)) {
            return crow::response(401, R"({"error":"unauthorized"})");
        }
        crow::json::wvalue res;
        res["user"]["id"] = user.id;
        res["user"]["name"] = user.name;
        res["user"]["email"] = user.email;
        res["user"]["provider"] = user.provider;
        return crow::response(200, res);
    });

    // Auth: Logout
    CROW_ROUTE(app, "/api/auth/logout").methods(crow::HTTPMethod::Post)([&](const crow::request& req) {
        std::string token = extract_bearer_token(req);
        std::lock_guard<std::mutex> lock(mtx);
        db.delete_session(token);
        return crow::response(200, R"({"logged_out":true})");
    });

    // Dashboard (Authenticated)
    CROW_ROUTE(app, "/api/dashboard").methods(crow::HTTPMethod::Get)([&](const crow::request& req) {
        std::lock_guard<std::mutex> lock(mtx);
        User user;
        if (!authenticate(req, user)) {
            return crow::response(401, R"({"error":"unauthorized"})");
        }

        std::string today = resolve_date(req);
        const char* routine_date_param = req.url_params.get("routine_date");
        const char* week_start_param = req.url_params.get("week_start");
        const char* week_end_param = req.url_params.get("week_end");

        std::string routine_date = (routine_date_param && std::string(routine_date_param).size() == 10)
                                       ? std::string(routine_date_param)
                                       : today;

        auto tasks = db.get_all_tasks(user.id, today);
        auto habits = db.get_habits(user.id, today);
        auto summary = db.get_summary(user.id, today);
        auto notes = db.get_notes(user.id);

        std::vector<RoutineBlock> routines;
        if (week_start_param && week_end_param &&
            std::string(week_start_param).size() == 10 &&
            std::string(week_end_param).size() == 10) {
            auto all_r = db.get_routine_blocks(user.id, "");
            std::string ws(week_start_param);
            std::string we(week_end_param);
            for (const auto& r : all_r) {
                if (r.block_date >= ws && r.block_date <= we) {
                    routines.push_back(r);
                }
            }
        } else {
            routines = db.get_routine_blocks(user.id, routine_date);
        }

        std::vector<crow::json::wvalue> task_list;
        for (const auto& t : tasks) {
            crow::json::wvalue item;
            item["id"] = t.id;
            item["title"] = t.title;
            item["completed"] = t.completed;
            item["priority"] = t.priority;
            item["due_at"] = t.due_at;
            item["completed_at"] = t.completed_at;
            item["overdue"] = (!t.completed && !t.due_at.empty() && t.due_at < today);
            task_list.push_back(std::move(item));
        }

        std::vector<crow::json::wvalue> habit_list;
        for (const auto& h : habits) {
            crow::json::wvalue item;
            item["id"] = h.id;
            item["title"] = h.title;
            item["completed_today"] = h.completed_today;
            item["week_count"] = h.week_count;
            habit_list.push_back(std::move(item));
        }

        std::vector<crow::json::wvalue> note_list;
        for (const auto& n : notes) {
            crow::json::wvalue item;
            item["id"] = n.id;
            item["note_date"] = n.note_date;
            item["title"] = n.title;
            item["content"] = n.content;
            item["updated_at"] = n.updated_at;
            note_list.push_back(std::move(item));
        }

        std::vector<crow::json::wvalue> routine_list;
        for (const auto& r : routines) {
            crow::json::wvalue item;
            item["id"] = r.id;
            item["block_date"] = r.block_date;
            item["start_time"] = r.start_time;
            item["end_time"] = r.end_time;
            item["title"] = r.title;
            item["category"] = r.category;
            item["important"] = r.important;
            item["completed"] = r.completed;
            routine_list.push_back(std::move(item));
        }

        std::vector<crow::json::wvalue> weekly_list;
        for (const auto& d : summary.weekly) {
            crow::json::wvalue item;
            item["date"] = d.date;
            item["label"] = d.label;
            item["completed_tasks"] = d.completed_tasks;
            item["focus_minutes"] = d.focus_minutes;
            item["score"] = d.score;
            weekly_list.push_back(std::move(item));
        }

        crow::json::wvalue res;
        res["today"] = today;
        res["user"]["id"] = user.id;
        res["user"]["name"] = user.name;
        res["user"]["email"] = user.email;
        res["user"]["provider"] = user.provider;
        res["tasks"] = std::move(task_list);
        res["habits"] = std::move(habit_list);
        res["notes"] = std::move(note_list);
        res["routines"] = std::move(routine_list);
        res["summary"]["total"] = summary.total;
        res["summary"]["completed"] = summary.completed;
        res["summary"]["pending"] = summary.pending;
        res["summary"]["overdue"] = summary.overdue;
        res["summary"]["completion_rate"] = summary.completion_rate;
        res["summary"]["today_focus_minutes"] = summary.today_focus_minutes;
        res["summary"]["week_focus_minutes"] = summary.week_focus_minutes;
        res["summary"]["habits_done_today"] = summary.habits_done_today;
        res["summary"]["habits_total"] = summary.habits_total;
        res["summary"]["flow_score"] = summary.flow_score;
        res["summary"]["weekly"] = std::move(weekly_list);

        return crow::response(200, res);
    });

    CROW_ROUTE(app, "/api/tasks").methods(crow::HTTPMethod::Post)([&](const crow::request& req) {
        std::lock_guard<std::mutex> lock(mtx);
        User user;
        if (!authenticate(req, user)) return crow::response(401, R"({"error":"unauthorized"})");

        auto body = crow::json::load(req.body);
        if (!body || !body.has("title") || body["title"].t() != crow::json::type::String) {
            return crow::response(400, R"({"error":"title is required"})");
        }
        std::string title = body["title"].s();
        if (title.empty()) return crow::response(400, R"({"error":"title cannot be empty"})");

        std::string priority = (body.has("priority") && body["priority"].t() == crow::json::type::String) ? std::string(body["priority"].s()) : "medium";
        std::string due_at = (body.has("due_at") && body["due_at"].t() == crow::json::type::String) ? std::string(body["due_at"].s()) : "";

        Task created;
        if (!db.create_task(user.id, title, priority, due_at, created)) {
            return crow::response(500, R"({"error":"failed to create task"})");
        }

        crow::json::wvalue res;
        res["id"] = created.id;
        res["title"] = created.title;
        res["completed"] = created.completed;
        res["priority"] = created.priority;
        res["due_at"] = created.due_at;
        return crow::response(201, res);
    });

    CROW_ROUTE(app, "/api/tasks/<int>").methods(crow::HTTPMethod::Patch)([&](const crow::request& req, int id) {
        std::lock_guard<std::mutex> lock(mtx);
        User user;
        if (!authenticate(req, user)) return crow::response(401, R"({"error":"unauthorized"})");

        auto body = crow::json::load(req.body);
        std::string today = resolve_date(req);
        if (body && body.has("today") && body["today"].t() == crow::json::type::String) today = body["today"].s();

        bool has_completed = body && body.has("completed") &&
                             (body["completed"].t() == crow::json::type::True || body["completed"].t() == crow::json::type::False);
        bool completed = has_completed ? body["completed"].b() : false;

        bool has_title = body && body.has("title") && body["title"].t() == crow::json::type::String;
        std::string new_title = has_title ? std::string(body["title"].s()) : "";

        bool has_priority = body && body.has("priority") && body["priority"].t() == crow::json::type::String;
        std::string new_priority = has_priority ? std::string(body["priority"].s()) : "";

        bool has_due_at = body && body.has("due_at") && body["due_at"].t() == crow::json::type::String;
        std::string new_due_at = has_due_at ? std::string(body["due_at"].s()) : "";

        Task updated;
        if (!db.update_task(user.id, id, has_completed, completed, has_title, new_title, has_priority, new_priority, has_due_at, new_due_at, today, updated)) {
            return crow::response(404, R"({"error":"task not found"})");
        }

        crow::json::wvalue res;
        res["id"] = updated.id;
        res["title"] = updated.title;
        res["completed"] = updated.completed;
        res["priority"] = updated.priority;
        res["due_at"] = updated.due_at;
        return crow::response(200, res);
    });

    CROW_ROUTE(app, "/api/tasks/<int>").methods(crow::HTTPMethod::Delete)([&](const crow::request& req, int id) {
        std::lock_guard<std::mutex> lock(mtx);
        User user;
        if (!authenticate(req, user)) return crow::response(401, R"({"error":"unauthorized"})");

        if (!db.delete_task(user.id, id)) {
            return crow::response(404, R"({"error":"task not found"})");
        }
        return crow::response(200, R"({"deleted":true})");
    });

    CROW_ROUTE(app, "/api/focus-sessions").methods(crow::HTTPMethod::Post)([&](const crow::request& req) {
        std::lock_guard<std::mutex> lock(mtx);
        User user;
        if (!authenticate(req, user)) return crow::response(401, R"({"error":"unauthorized"})");

        auto body = crow::json::load(req.body);
        if (!body || !body.has("duration_minutes")) {
            return crow::response(400, R"({"error":"duration_minutes is required"})");
        }

        int minutes = static_cast<int>(body["duration_minutes"].i());
        std::string task_title = (body.has("task_title") && body["task_title"].t() == crow::json::type::String) ? std::string(body["task_title"].s()) : "Deep Focus Session";
        std::string today = (body.has("today") && body["today"].t() == crow::json::type::String) ? std::string(body["today"].s()) : server_today();

        FocusSession created;
        if (!db.log_focus_session(user.id, task_title, minutes, today, created)) {
            return crow::response(400, R"({"error":"invalid focus session"})");
        }

        crow::json::wvalue res;
        res["id"] = created.id;
        res["task_title"] = created.task_title;
        res["duration_minutes"] = created.duration_minutes;
        return crow::response(201, res);
    });

    CROW_ROUTE(app, "/api/habits").methods(crow::HTTPMethod::Post)([&](const crow::request& req) {
        std::lock_guard<std::mutex> lock(mtx);
        User user;
        if (!authenticate(req, user)) return crow::response(401, R"({"error":"unauthorized"})");

        auto body = crow::json::load(req.body);
        if (!body || !body.has("title") || body["title"].t() != crow::json::type::String) {
            return crow::response(400, R"({"error":"title is required"})");
        }
        std::string title = body["title"].s();
        if (title.empty()) return crow::response(400, R"({"error":"title cannot be empty"})");

        Habit created;
        if (!db.create_habit(user.id, title, created)) {
            return crow::response(500, R"({"error":"failed to create habit"})");
        }

        crow::json::wvalue res;
        res["id"] = created.id;
        res["title"] = created.title;
        res["completed_today"] = created.completed_today;
        return crow::response(201, res);
    });

    CROW_ROUTE(app, "/api/habits/<int>/toggle").methods(crow::HTTPMethod::Post)([&](const crow::request& req, int id) {
        std::lock_guard<std::mutex> lock(mtx);
        User user;
        if (!authenticate(req, user)) return crow::response(401, R"({"error":"unauthorized"})");

        auto body = crow::json::load(req.body);
        std::string today = (body && body.has("today") && body["today"].t() == crow::json::type::String) ? std::string(body["today"].s()) : server_today();

        bool completed = false;
        if (!db.toggle_habit(user.id, id, today, completed)) {
            return crow::response(400, R"({"error":"could not toggle habit"})");
        }

        crow::json::wvalue res;
        res["id"] = id;
        res["completed_today"] = completed;
        return crow::response(200, res);
    });

    CROW_ROUTE(app, "/api/habits/<int>").methods(crow::HTTPMethod::Delete)([&](const crow::request& req, int id) {
        std::lock_guard<std::mutex> lock(mtx);
        User user;
        if (!authenticate(req, user)) return crow::response(401, R"({"error":"unauthorized"})");

        if (!db.delete_habit(user.id, id)) {
            return crow::response(404, R"({"error":"habit not found"})");
        }
        return crow::response(200, R"({"deleted":true})");
    });

    CROW_ROUTE(app, "/api/notes").methods(crow::HTTPMethod::Post)([&](const crow::request& req) {
        std::lock_guard<std::mutex> lock(mtx);
        User user;
        if (!authenticate(req, user)) return crow::response(401, R"({"error":"unauthorized"})");

        auto body = crow::json::load(req.body);
        if (!body) return crow::response(400, R"({"error":"invalid JSON"})");

        std::string note_date = (body.has("note_date") && body["note_date"].t() == crow::json::type::String) ? std::string(body["note_date"].s()) : server_today();
        std::string title = (body.has("title") && body["title"].t() == crow::json::type::String) ? std::string(body["title"].s()) : "";
        std::string content = (body.has("content") && body["content"].t() == crow::json::type::String) ? std::string(body["content"].s()) : "";

        NoteEntry saved;
        if (!db.save_note(user.id, note_date, title, content, saved)) {
            return crow::response(500, R"({"error":"failed to save note"})");
        }

        crow::json::wvalue res;
        res["id"] = saved.id;
        res["note_date"] = saved.note_date;
        res["title"] = saved.title;
        res["content"] = saved.content;
        return crow::response(200, res);
    });

    CROW_ROUTE(app, "/api/notes/<int>").methods(crow::HTTPMethod::Delete)([&](const crow::request& req, int id) {
        std::lock_guard<std::mutex> lock(mtx);
        User user;
        if (!authenticate(req, user)) return crow::response(401, R"({"error":"unauthorized"})");

        if (!db.delete_note(user.id, id)) {
            return crow::response(404, R"({"error":"note not found"})");
        }
        return crow::response(200, R"({"deleted":true})");
    });

    CROW_ROUTE(app, "/api/routines").methods(crow::HTTPMethod::Post)([&](const crow::request& req) {
        std::lock_guard<std::mutex> lock(mtx);
        User user;
        if (!authenticate(req, user)) return crow::response(401, R"({"error":"unauthorized"})");

        auto body = crow::json::load(req.body);
        if (!body || !body.has("title") || body["title"].t() != crow::json::type::String) {
            return crow::response(400, R"({"error":"title is required"})");
        }
        std::string title = body["title"].s();
        if (title.empty()) return crow::response(400, R"({"error":"title cannot be empty"})");

        std::string block_date = (body.has("block_date") && body["block_date"].t() == crow::json::type::String) ? std::string(body["block_date"].s()) : server_today();
        std::string start_time = (body.has("start_time") && body["start_time"].t() == crow::json::type::String) ? std::string(body["start_time"].s()) : "09:00";
        std::string end_time = (body.has("end_time") && body["end_time"].t() == crow::json::type::String) ? std::string(body["end_time"].s()) : "10:00";
        std::string category = (body.has("category") && body["category"].t() == crow::json::type::String) ? std::string(body["category"].s()) : "routine";
        bool important = (body.has("important") && body["important"].t() == crow::json::type::True);

        RoutineBlock created;
        if (!db.create_routine_block(user.id, block_date, start_time, end_time, title, category, important, created)) {
            return crow::response(500, R"({"error":"failed to create routine block"})");
        }

        crow::json::wvalue res;
        res["id"] = created.id;
        res["block_date"] = created.block_date;
        res["start_time"] = created.start_time;
        res["end_time"] = created.end_time;
        res["title"] = created.title;
        res["category"] = created.category;
        res["important"] = created.important;
        res["completed"] = created.completed;
        return crow::response(201, res);
    });

    CROW_ROUTE(app, "/api/routines/<int>/toggle").methods(crow::HTTPMethod::Post)([&](const crow::request& req, int id) {
        std::lock_guard<std::mutex> lock(mtx);
        User user;
        if (!authenticate(req, user)) return crow::response(401, R"({"error":"unauthorized"})");

        bool completed = false;
        if (!db.toggle_routine_block(user.id, id, completed)) {
            return crow::response(404, R"({"error":"routine block not found"})");
        }
        crow::json::wvalue res;
        res["id"] = id;
        res["completed"] = completed;
        return crow::response(200, res);
    });

    CROW_ROUTE(app, "/api/routines/<int>").methods(crow::HTTPMethod::Delete)([&](const crow::request& req, int id) {
        std::lock_guard<std::mutex> lock(mtx);
        User user;
        if (!authenticate(req, user)) return crow::response(401, R"({"error":"unauthorized"})");

        if (!db.delete_routine_block(user.id, id)) {
            return crow::response(404, R"({"error":"routine block not found"})");
        }
        return crow::response(200, R"({"deleted":true})");
    });

    app.port(18080).multithreaded().run();
}