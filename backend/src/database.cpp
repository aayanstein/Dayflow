#include "database.h"
#include <sqlite3.h>
#include <algorithm>
#include <cctype>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <ctime>
#include <iomanip>
#include <iostream>
#include <random>
#include <sstream>

namespace {
sqlite3* as_sqlite(void* ptr) {
    return static_cast<sqlite3*>(ptr);
}

std::string to_lower_trim(const std::string& raw) {
    size_t start = 0;
    while (start < raw.size() && std::isspace(static_cast<unsigned char>(raw[start]))) ++start;
    size_t end = raw.size();
    while (end > start && std::isspace(static_cast<unsigned char>(raw[end - 1]))) --end;

    std::string out = raw.substr(start, end - start);
    std::transform(out.begin(), out.end(), out.begin(), [](unsigned char c) {
        return static_cast<char>(std::tolower(c));
    });
    return out;
}

std::string generate_random_hex(size_t bytes_count) {
    static std::mt19937_64 rng(
        static_cast<uint64_t>(std::chrono::steady_clock::now().time_since_epoch().count()) ^
        static_cast<uint64_t>(reinterpret_cast<uintptr_t>(&rng)));
    std::uniform_int_distribution<uint64_t> dist;

    std::ostringstream oss;
    oss << std::hex << std::setfill('0');
    size_t generated = 0;
    while (generated < bytes_count) {
        uint64_t r = dist(rng);
        for (int i = 0; i < 8 && generated < bytes_count; ++i, ++generated) {
            uint8_t b = static_cast<uint8_t>((r >> (i * 8)) & 0xFF);
            oss << std::setw(2) << static_cast<int>(b);
        }
    }
    return oss.str();
}

std::string hash_password_with_salt(const std::string& password, const std::string& salt) {
    uint64_t h1 = 14695981039346656037ULL;
    uint64_t h2 = 1099511628211ULL;
    std::string combined = salt + ":" + password + ":" + salt;

    for (int round = 0; round < 4096; ++round) {
        for (unsigned char c : combined) {
            h1 ^= static_cast<uint64_t>(c) + static_cast<uint64_t>(round & 0xFF);
            h1 *= 1099511628211ULL;
            h2 ^= (h1 >> ((round % 5) * 8));
            h2 *= 14695981039346656037ULL;
        }
        std::ostringstream step;
        step << std::hex << h1 << h2 << round;
        combined = step.str();
    }

    std::ostringstream out;
    out << std::hex << std::setfill('0') << std::setw(16) << h1 << std::setw(16) << h2;
    return out.str();
}

std::string normalize_priority(const std::string& raw) {
    std::string p = to_lower_trim(raw);
    if (p == "low" || p == "medium" || p == "high" || p == "urgent") {
        return p;
    }
    return "medium";
}

std::string shift_date(const std::string& ymd, int delta_days) {
    int y = 2026, m = 1, d = 1;
    if (std::sscanf(ymd.c_str(), "%d-%d-%d", &y, &m, &d) != 3) {
        return ymd;
    }
    std::tm tm_val = {};
    tm_val.tm_year = y - 1900;
    tm_val.tm_mon = m - 1;
    tm_val.tm_mday = d + delta_days;
    tm_val.tm_hour = 12;
    std::mktime(&tm_val);

    char buf[16];
    std::strftime(buf, sizeof(buf), "%Y-%m-%d", &tm_val);
    return std::string(buf);
}

std::string weekday_short(const std::string& ymd) {
    static const char* names[] = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};
    int y = 2026, m = 1, d = 1;
    if (std::sscanf(ymd.c_str(), "%d-%d-%d", &y, &m, &d) != 3) {
        return "Day";
    }
    std::tm tm_val = {};
    tm_val.tm_year = y - 1900;
    tm_val.tm_mon = m - 1;
    tm_val.tm_mday = d;
    tm_val.tm_hour = 12;
    std::mktime(&tm_val);
    return names[tm_val.tm_wday];
}
}

Database::Database(const std::string& db_path) {
    sqlite3* db = nullptr;
    if (sqlite3_open(db_path.c_str(), &db) == SQLITE_OK) {
        db_handle_ = db;
        open_ = true;
        sqlite3_exec(db, "PRAGMA foreign_keys = ON;", nullptr, nullptr, nullptr);
    } else {
        std::cerr << "Failed to open SQLite database: " << (db ? sqlite3_errmsg(db) : "unknown") << "\n";
        if (db) sqlite3_close(db);
    }
}

Database::~Database() {
    if (db_handle_) {
        sqlite3_close(as_sqlite(db_handle_));
        db_handle_ = nullptr;
        open_ = false;
    }
}

bool Database::is_open() const {
    return open_ && db_handle_ != nullptr;
}

bool Database::init_schema() {
    if (!is_open()) return false;

    const char* schema_sql = R"(
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL DEFAULT '',
            salt TEXT NOT NULL DEFAULT '',
            provider TEXT NOT NULL DEFAULT 'local',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL DEFAULT 1,
            title TEXT NOT NULL,
            completed INTEGER NOT NULL DEFAULT 0,
            priority TEXT NOT NULL DEFAULT 'medium',
            due_at TEXT NOT NULL DEFAULT '',
            completed_at TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS focus_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL DEFAULT 1,
            task_title TEXT NOT NULL DEFAULT 'Deep Focus Session',
            duration_minutes INTEGER NOT NULL,
            session_date TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS habits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL DEFAULT 1,
            title TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS habit_logs (
            habit_id INTEGER NOT NULL,
            log_date TEXT NOT NULL,
            PRIMARY KEY (habit_id, log_date),
            FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL DEFAULT 1,
            note_date TEXT NOT NULL,
            title TEXT NOT NULL DEFAULT 'Daily Note',
            content TEXT NOT NULL DEFAULT '',
            updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS routine_blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL DEFAULT 1,
            block_date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'routine',
            important INTEGER NOT NULL DEFAULT 0,
            completed INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    )";

    char* err_msg = nullptr;
    if (sqlite3_exec(as_sqlite(db_handle_), schema_sql, nullptr, nullptr, &err_msg) != SQLITE_OK) {
        std::cerr << "Schema error: " << (err_msg ? err_msg : "unknown") << "\n";
        if (err_msg) sqlite3_free(err_msg);
        return false;
    }

    return true;
}

bool Database::register_user(const std::string& name, const std::string& email, const std::string& password, User& out_user, std::string& out_error) {
    if (!is_open()) {
        out_error = "Database unavailable";
        return false;
    }

    std::string clean_email = to_lower_trim(email);
    std::string clean_name = name.empty() ? "User" : name;
    if (clean_email.empty() || clean_email.find('@') == std::string::npos) {
        out_error = "Please enter a valid email address";
        return false;
    }
    if (password.size() < 6) {
        out_error = "Password must be at least 6 characters";
        return false;
    }

    sqlite3_stmt* chk = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), "SELECT id FROM users WHERE email = ?;", -1, &chk, nullptr) == SQLITE_OK) {
        sqlite3_bind_text(chk, 1, clean_email.c_str(), -1, SQLITE_TRANSIENT);
        bool exists = (sqlite3_step(chk) == SQLITE_ROW);
        sqlite3_finalize(chk);
        if (exists) {
            out_error = "An account with this email already exists";
            return false;
        }
    }

    std::string salt = generate_random_hex(16);
    std::string hash = hash_password_with_salt(password, salt);

    const char* ins = "INSERT INTO users (name, email, password_hash, salt, provider) VALUES (?, ?, ?, ?, 'local');";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), ins, -1, &stmt, nullptr) != SQLITE_OK) {
        out_error = "Failed to prepare registration";
        return false;
    }
    sqlite3_bind_text(stmt, 1, clean_name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, clean_email.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, hash.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, salt.c_str(), -1, SQLITE_TRANSIENT);

    bool ok = (sqlite3_step(stmt) == SQLITE_DONE);
    sqlite3_finalize(stmt);
    if (!ok) {
        out_error = "Could not create user account";
        return false;
    }

    int user_id = static_cast<int>(sqlite3_last_insert_rowid(as_sqlite(db_handle_)));
    out_user = {user_id, clean_name, clean_email, "local"};

    const char* h_sql = "INSERT INTO habits (user_id, title) VALUES (?, '25 min Deep Work block'), (?, 'Review daily routine & key tasks');";
    sqlite3_stmt* h_stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), h_sql, -1, &h_stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_int(h_stmt, 1, user_id);
        sqlite3_bind_int(h_stmt, 2, user_id);
        sqlite3_step(h_stmt);
        sqlite3_finalize(h_stmt);
    }

    return true;
}

bool Database::login_user(const std::string& email, const std::string& password, User& out_user, std::string& out_error) {
    if (!is_open()) {
        out_error = "Database unavailable";
        return false;
    }

    std::string clean_email = to_lower_trim(email);
    const char* sql = "SELECT id, name, email, password_hash, salt, provider FROM users WHERE email = ?;";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), sql, -1, &stmt, nullptr) != SQLITE_OK) {
        out_error = "Login query failed";
        return false;
    }
    sqlite3_bind_text(stmt, 1, clean_email.c_str(), -1, SQLITE_TRANSIENT);

    bool found = false;
    int id = 0;
    std::string name, db_email, stored_hash, salt, provider;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        found = true;
        id = sqlite3_column_int(stmt, 0);
        const unsigned char* n = sqlite3_column_text(stmt, 1);
        const unsigned char* e = sqlite3_column_text(stmt, 2);
        const unsigned char* h = sqlite3_column_text(stmt, 3);
        const unsigned char* s = sqlite3_column_text(stmt, 4);
        const unsigned char* p = sqlite3_column_text(stmt, 5);
        name = n ? reinterpret_cast<const char*>(n) : "";
        db_email = e ? reinterpret_cast<const char*>(e) : "";
        stored_hash = h ? reinterpret_cast<const char*>(h) : "";
        salt = s ? reinterpret_cast<const char*>(s) : "";
        provider = p ? reinterpret_cast<const char*>(p) : "local";
    }
    sqlite3_finalize(stmt);

    if (!found || stored_hash.empty()) {
        out_error = "Invalid email or password";
        return false;
    }

    std::string candidate = hash_password_with_salt(password, salt);
    if (candidate != stored_hash) {
        out_error = "Invalid email or password";
        return false;
    }

    out_user = {id, name, db_email, provider};
    return true;
}

bool Database::oauth_login_or_create(const std::string& provider, const std::string& name, const std::string& email, User& out_user, std::string& out_error) {
    if (!is_open()) {
        out_error = "Database unavailable";
        return false;
    }

    std::string clean_provider = to_lower_trim(provider);
    if (clean_provider != "google" && clean_provider != "github" && clean_provider != "guest") {
        clean_provider = "other";
    }

    std::string clean_email = to_lower_trim(email);
    if (clean_email.empty()) {
        clean_email = clean_provider + "_" + generate_random_hex(4) + "@dayflow.local";
    }
    std::string clean_name = name.empty() ? (clean_provider == "google" ? "Google User" : "Dayflow Member") : name;

    sqlite3_stmt* sel = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), "SELECT id, name, email, provider FROM users WHERE email = ?;", -1, &sel, nullptr) == SQLITE_OK) {
        sqlite3_bind_text(sel, 1, clean_email.c_str(), -1, SQLITE_TRANSIENT);
        if (sqlite3_step(sel) == SQLITE_ROW) {
            int id = sqlite3_column_int(sel, 0);
            const unsigned char* n = sqlite3_column_text(sel, 1);
            const unsigned char* e = sqlite3_column_text(sel, 2);
            const unsigned char* p = sqlite3_column_text(sel, 3);
            out_user = {
                id,
                n ? reinterpret_cast<const char*>(n) : clean_name,
                e ? reinterpret_cast<const char*>(e) : clean_email,
                p ? reinterpret_cast<const char*>(p) : clean_provider
            };
            sqlite3_finalize(sel);
            return true;
        }
        sqlite3_finalize(sel);
    }

    const char* ins = "INSERT INTO users (name, email, password_hash, salt, provider) VALUES (?, ?, '', '', ?);";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), ins, -1, &stmt, nullptr) != SQLITE_OK) {
        out_error = "Could not create provider account";
        return false;
    }
    sqlite3_bind_text(stmt, 1, clean_name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, clean_email.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, clean_provider.c_str(), -1, SQLITE_TRANSIENT);

    bool ok = (sqlite3_step(stmt) == SQLITE_DONE);
    sqlite3_finalize(stmt);
    if (!ok) {
        out_error = "Provider sign-in failed";
        return false;
    }

    int user_id = static_cast<int>(sqlite3_last_insert_rowid(as_sqlite(db_handle_)));
    out_user = {user_id, clean_name, clean_email, clean_provider};

    const char* h_sql = "INSERT INTO habits (user_id, title) VALUES (?, '25 min Deep Work block'), (?, 'Review daily routine & key tasks');";
    sqlite3_stmt* h_stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), h_sql, -1, &h_stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_int(h_stmt, 1, user_id);
        sqlite3_bind_int(h_stmt, 2, user_id);
        sqlite3_step(h_stmt);
        sqlite3_finalize(h_stmt);
    }

    return true;
}

std::string Database::create_session(int user_id) {
    if (!is_open() || user_id <= 0) return "";
    std::string token = generate_random_hex(24);
    const char* sql = "INSERT INTO sessions (token, user_id) VALUES (?, ?);";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), sql, -1, &stmt, nullptr) != SQLITE_OK) return "";
    sqlite3_bind_text(stmt, 1, token.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 2, user_id);
    bool ok = (sqlite3_step(stmt) == SQLITE_DONE);
    sqlite3_finalize(stmt);
    return ok ? token : "";
}

bool Database::get_user_by_token(const std::string& token, User& out_user) {
    if (!is_open() || token.empty()) return false;
    const char* sql = R"(
        SELECT u.id, u.name, u.email, u.provider
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ?;
    )";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), sql, -1, &stmt, nullptr) != SQLITE_OK) return false;
    sqlite3_bind_text(stmt, 1, token.c_str(), -1, SQLITE_TRANSIENT);

    bool found = false;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        found = true;
        out_user.id = sqlite3_column_int(stmt, 0);
        const unsigned char* n = sqlite3_column_text(stmt, 1);
        const unsigned char* e = sqlite3_column_text(stmt, 2);
        const unsigned char* p = sqlite3_column_text(stmt, 3);
        out_user.name = n ? reinterpret_cast<const char*>(n) : "";
        out_user.email = e ? reinterpret_cast<const char*>(e) : "";
        out_user.provider = p ? reinterpret_cast<const char*>(p) : "local";
    }
    sqlite3_finalize(stmt);
    return found;
}

bool Database::delete_session(const std::string& token) {
    if (!is_open() || token.empty()) return false;
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), "DELETE FROM sessions WHERE token = ?;", -1, &stmt, nullptr) != SQLITE_OK) return false;
    sqlite3_bind_text(stmt, 1, token.c_str(), -1, SQLITE_TRANSIENT);
    bool ok = (sqlite3_step(stmt) == SQLITE_DONE);
    sqlite3_finalize(stmt);
    return ok;
}

std::vector<Task> Database::get_all_tasks(int user_id, const std::string&) {
    std::vector<Task> result;
    if (!is_open()) return result;

    const char* sql = "SELECT id, title, completed, priority, due_at, completed_at FROM tasks WHERE user_id = ? ORDER BY completed ASC, id DESC;";
    sqlite3_stmt* stmt = nullptr;

    if (sqlite3_prepare_v2(as_sqlite(db_handle_), sql, -1, &stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_int(stmt, 1, user_id);
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            Task t;
            t.id = sqlite3_column_int(stmt, 0);
            const unsigned char* txt = sqlite3_column_text(stmt, 1);
            t.title = txt ? reinterpret_cast<const char*>(txt) : "";
            t.completed = sqlite3_column_int(stmt, 2) != 0;
            const unsigned char* prio = sqlite3_column_text(stmt, 3);
            t.priority = prio ? normalize_priority(reinterpret_cast<const char*>(prio)) : "medium";
            const unsigned char* due = sqlite3_column_text(stmt, 4);
            t.due_at = due ? reinterpret_cast<const char*>(due) : "";
            const unsigned char* comp_at = sqlite3_column_text(stmt, 5);
            t.completed_at = comp_at ? reinterpret_cast<const char*>(comp_at) : "";
            result.push_back(std::move(t));
        }
    }
    if (stmt) sqlite3_finalize(stmt);
    return result;
}

bool Database::create_task(int user_id, const std::string& title, const std::string& priority, const std::string& due_at, Task& out_task) {
    if (!is_open() || title.empty()) return false;

    std::string clean_priority = normalize_priority(priority);
    const char* sql = "INSERT INTO tasks (user_id, title, completed, priority, due_at, completed_at) VALUES (?, ?, 0, ?, ?, '');";
    sqlite3_stmt* stmt = nullptr;

    if (sqlite3_prepare_v2(as_sqlite(db_handle_), sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return false;
    }

    sqlite3_bind_int(stmt, 1, user_id);
    sqlite3_bind_text(stmt, 2, title.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, clean_priority.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, due_at.c_str(), -1, SQLITE_TRANSIENT);

    bool ok = (sqlite3_step(stmt) == SQLITE_DONE);
    sqlite3_finalize(stmt);
    if (!ok) return false;

    out_task.id = static_cast<int>(sqlite3_last_insert_rowid(as_sqlite(db_handle_)));
    out_task.title = title;
    out_task.completed = false;
    out_task.priority = clean_priority;
    out_task.due_at = due_at;
    out_task.completed_at = "";
    return true;
}

bool Database::update_task(
    int user_id,
    int id,
    bool has_completed,
    bool completed,
    bool has_title,
    const std::string& title,
    bool has_priority,
    const std::string& priority,
    bool has_due_at,
    const std::string& due_at,
    const std::string& today_date,
    Task& out_task
) {
    if (!is_open()) return false;

    const char* sel_sql = "SELECT id, title, completed, priority, due_at, completed_at FROM tasks WHERE id = ? AND user_id = ?;";
    sqlite3_stmt* sel_stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), sel_sql, -1, &sel_stmt, nullptr) != SQLITE_OK) {
        return false;
    }
    sqlite3_bind_int(sel_stmt, 1, id);
    sqlite3_bind_int(sel_stmt, 2, user_id);

    Task current;
    bool found = false;
    if (sqlite3_step(sel_stmt) == SQLITE_ROW) {
        found = true;
        current.id = sqlite3_column_int(sel_stmt, 0);
        const unsigned char* txt = sqlite3_column_text(sel_stmt, 1);
        current.title = txt ? reinterpret_cast<const char*>(txt) : "";
        current.completed = sqlite3_column_int(sel_stmt, 2) != 0;
        const unsigned char* prio = sqlite3_column_text(sel_stmt, 3);
        current.priority = prio ? normalize_priority(reinterpret_cast<const char*>(prio)) : "medium";
        const unsigned char* due = sqlite3_column_text(sel_stmt, 4);
        current.due_at = due ? reinterpret_cast<const char*>(due) : "";
        const unsigned char* comp_at = sqlite3_column_text(sel_stmt, 5);
        current.completed_at = comp_at ? reinterpret_cast<const char*>(comp_at) : "";
    }
    sqlite3_finalize(sel_stmt);
    if (!found) return false;

    if (has_completed) {
        current.completed = completed;
    } else if (!has_title && !has_priority && !has_due_at) {
        current.completed = !current.completed;
    }

    current.completed_at = current.completed ? today_date : "";

    if (has_title && !title.empty()) current.title = title;
    if (has_priority) current.priority = normalize_priority(priority);
    if (has_due_at) current.due_at = due_at;

    const char* upd_sql = "UPDATE tasks SET title = ?, completed = ?, priority = ?, due_at = ?, completed_at = ? WHERE id = ? AND user_id = ?;";
    sqlite3_stmt* upd_stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), upd_sql, -1, &upd_stmt, nullptr) != SQLITE_OK) {
        return false;
    }

    sqlite3_bind_text(upd_stmt, 1, current.title.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(upd_stmt, 2, current.completed ? 1 : 0);
    sqlite3_bind_text(upd_stmt, 3, current.priority.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(upd_stmt, 4, current.due_at.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(upd_stmt, 5, current.completed_at.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(upd_stmt, 6, id);
    sqlite3_bind_int(upd_stmt, 7, user_id);

    bool ok = (sqlite3_step(upd_stmt) == SQLITE_DONE);
    sqlite3_finalize(upd_stmt);
    if (ok) out_task = current;
    return ok;
}

bool Database::delete_task(int user_id, int id) {
    if (!is_open()) return false;
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), "DELETE FROM tasks WHERE id = ? AND user_id = ?;", -1, &stmt, nullptr) != SQLITE_OK) {
        return false;
    }
    sqlite3_bind_int(stmt, 1, id);
    sqlite3_bind_int(stmt, 2, user_id);
    int rc = sqlite3_step(stmt);
    int changes = sqlite3_changes(as_sqlite(db_handle_));
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE && changes > 0);
}

bool Database::log_focus_session(int user_id, const std::string& task_title, int duration_minutes, const std::string& today_date, FocusSession& out_session) {
    if (!is_open() || duration_minutes <= 0) return false;

    std::string label = task_title.empty() ? "Deep Focus Session" : task_title;
    const char* sql = "INSERT INTO focus_sessions (user_id, task_title, duration_minutes, session_date) VALUES (?, ?, ?, ?);";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return false;
    }

    sqlite3_bind_int(stmt, 1, user_id);
    sqlite3_bind_text(stmt, 2, label.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 3, duration_minutes);
    sqlite3_bind_text(stmt, 4, today_date.c_str(), -1, SQLITE_TRANSIENT);

    bool ok = (sqlite3_step(stmt) == SQLITE_DONE);
    sqlite3_finalize(stmt);
    if (!ok) return false;

    out_session.id = static_cast<int>(sqlite3_last_insert_rowid(as_sqlite(db_handle_)));
    out_session.task_title = label;
    out_session.duration_minutes = duration_minutes;
    out_session.session_date = today_date;
    return true;
}

std::vector<Habit> Database::get_habits(int user_id, const std::string& today_date) {
    std::vector<Habit> list;
    if (!is_open()) return list;

    std::string week_start = shift_date(today_date, -6);
    const char* sql = R"(
        SELECT
            h.id,
            h.title,
            EXISTS(SELECT 1 FROM habit_logs hl WHERE hl.habit_id = h.id AND hl.log_date = ?),
            (SELECT COUNT(*) FROM habit_logs hl2 WHERE hl2.habit_id = h.id AND hl2.log_date >= ? AND hl2.log_date <= ?)
        FROM habits h
        WHERE h.user_id = ?
        ORDER BY h.id ASC;
    )";

    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), sql, -1, &stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_text(stmt, 1, today_date.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 2, week_start.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 3, today_date.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, 4, user_id);

        while (sqlite3_step(stmt) == SQLITE_ROW) {
            Habit h;
            h.id = sqlite3_column_int(stmt, 0);
            const unsigned char* txt = sqlite3_column_text(stmt, 1);
            h.title = txt ? reinterpret_cast<const char*>(txt) : "";
            h.completed_today = sqlite3_column_int(stmt, 2) != 0;
            h.week_count = sqlite3_column_int(stmt, 3);
            list.push_back(std::move(h));
        }
    }
    if (stmt) sqlite3_finalize(stmt);
    return list;
}

bool Database::create_habit(int user_id, const std::string& title, Habit& out_habit) {
    if (!is_open() || title.empty()) return false;
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), "INSERT INTO habits (user_id, title) VALUES (?, ?);", -1, &stmt, nullptr) != SQLITE_OK) {
        return false;
    }
    sqlite3_bind_int(stmt, 1, user_id);
    sqlite3_bind_text(stmt, 2, title.c_str(), -1, SQLITE_TRANSIENT);
    bool ok = (sqlite3_step(stmt) == SQLITE_DONE);
    sqlite3_finalize(stmt);
    if (!ok) return false;

    out_habit.id = static_cast<int>(sqlite3_last_insert_rowid(as_sqlite(db_handle_)));
    out_habit.title = title;
    out_habit.completed_today = false;
    out_habit.week_count = 0;
    return true;
}

bool Database::toggle_habit(int user_id, int id, const std::string& today_date, bool& out_completed) {
    if (!is_open()) return false;

    sqlite3_stmt* own = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), "SELECT 1 FROM habits WHERE id = ? AND user_id = ?;", -1, &own, nullptr) != SQLITE_OK) return false;
    sqlite3_bind_int(own, 1, id);
    sqlite3_bind_int(own, 2, user_id);
    bool valid_habit = (sqlite3_step(own) == SQLITE_ROW);
    sqlite3_finalize(own);
    if (!valid_habit) return false;

    sqlite3_stmt* chk = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), "SELECT 1 FROM habit_logs WHERE habit_id = ? AND log_date = ?;", -1, &chk, nullptr) != SQLITE_OK) {
        return false;
    }
    sqlite3_bind_int(chk, 1, id);
    sqlite3_bind_text(chk, 2, today_date.c_str(), -1, SQLITE_TRANSIENT);
    bool exists = (sqlite3_step(chk) == SQLITE_ROW);
    sqlite3_finalize(chk);

    sqlite3_stmt* mut = nullptr;
    if (exists) {
        if (sqlite3_prepare_v2(as_sqlite(db_handle_), "DELETE FROM habit_logs WHERE habit_id = ? AND log_date = ?;", -1, &mut, nullptr) != SQLITE_OK) {
            return false;
        }
        out_completed = false;
    } else {
        if (sqlite3_prepare_v2(as_sqlite(db_handle_), "INSERT INTO habit_logs (habit_id, log_date) VALUES (?, ?);", -1, &mut, nullptr) != SQLITE_OK) {
            return false;
        }
        out_completed = true;
    }
    sqlite3_bind_int(mut, 1, id);
    sqlite3_bind_text(mut, 2, today_date.c_str(), -1, SQLITE_TRANSIENT);
    bool ok = (sqlite3_step(mut) == SQLITE_DONE);
    sqlite3_finalize(mut);
    return ok;
}

bool Database::delete_habit(int user_id, int id) {
    if (!is_open()) return false;
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), "DELETE FROM habits WHERE id = ? AND user_id = ?;", -1, &stmt, nullptr) != SQLITE_OK) {
        return false;
    }
    sqlite3_bind_int(stmt, 1, id);
    sqlite3_bind_int(stmt, 2, user_id);
    int rc = sqlite3_step(stmt);
    int changes = sqlite3_changes(as_sqlite(db_handle_));
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE && changes > 0);
}

std::vector<NoteEntry> Database::get_notes(int user_id) {
    std::vector<NoteEntry> list;
    if (!is_open()) return list;

    const char* sql = "SELECT id, note_date, title, content, updated_at FROM notes WHERE user_id = ? ORDER BY note_date DESC, id DESC;";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), sql, -1, &stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_int(stmt, 1, user_id);
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            NoteEntry n;
            n.id = sqlite3_column_int(stmt, 0);
            const unsigned char* d = sqlite3_column_text(stmt, 1);
            n.note_date = d ? reinterpret_cast<const char*>(d) : "";
            const unsigned char* t = sqlite3_column_text(stmt, 2);
            n.title = t ? reinterpret_cast<const char*>(t) : "Daily Note";
            const unsigned char* c = sqlite3_column_text(stmt, 3);
            n.content = c ? reinterpret_cast<const char*>(c) : "";
            const unsigned char* u = sqlite3_column_text(stmt, 4);
            n.updated_at = u ? reinterpret_cast<const char*>(u) : "";
            list.push_back(std::move(n));
        }
    }
    if (stmt) sqlite3_finalize(stmt);
    return list;
}

bool Database::save_note(int user_id, const std::string& note_date, const std::string& title, const std::string& content, NoteEntry& out_note) {
    if (!is_open() || note_date.empty()) return false;

    std::string clean_title = title.empty() ? ("Note — " + note_date) : title;

    sqlite3_stmt* chk = nullptr;
    int existing_id = 0;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), "SELECT id FROM notes WHERE user_id = ? AND note_date = ? ORDER BY id DESC LIMIT 1;", -1, &chk, nullptr) == SQLITE_OK) {
        sqlite3_bind_int(chk, 1, user_id);
        sqlite3_bind_text(chk, 2, note_date.c_str(), -1, SQLITE_TRANSIENT);
        if (sqlite3_step(chk) == SQLITE_ROW) {
            existing_id = sqlite3_column_int(chk, 0);
        }
        sqlite3_finalize(chk);
    }

    if (existing_id > 0) {
        const char* upd = "UPDATE notes SET title = ?, content = ?, updated_at = datetime('now', 'localtime') WHERE id = ? AND user_id = ?;";
        sqlite3_stmt* stmt = nullptr;
        if (sqlite3_prepare_v2(as_sqlite(db_handle_), upd, -1, &stmt, nullptr) != SQLITE_OK) return false;
        sqlite3_bind_text(stmt, 1, clean_title.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 2, content.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, 3, existing_id);
        sqlite3_bind_int(stmt, 4, user_id);
        bool ok = (sqlite3_step(stmt) == SQLITE_DONE);
        sqlite3_finalize(stmt);
        if (!ok) return false;
        out_note.id = existing_id;
    } else {
        const char* ins = "INSERT INTO notes (user_id, note_date, title, content, updated_at) VALUES (?, ?, ?, ?, datetime('now', 'localtime'));";
        sqlite3_stmt* stmt = nullptr;
        if (sqlite3_prepare_v2(as_sqlite(db_handle_), ins, -1, &stmt, nullptr) != SQLITE_OK) return false;
        sqlite3_bind_int(stmt, 1, user_id);
        sqlite3_bind_text(stmt, 2, note_date.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 3, clean_title.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 4, content.c_str(), -1, SQLITE_TRANSIENT);
        bool ok = (sqlite3_step(stmt) == SQLITE_DONE);
        sqlite3_finalize(stmt);
        if (!ok) return false;
        out_note.id = static_cast<int>(sqlite3_last_insert_rowid(as_sqlite(db_handle_)));
    }

    out_note.note_date = note_date;
    out_note.title = clean_title;
    out_note.content = content;
    return true;
}

bool Database::delete_note(int user_id, int id) {
    if (!is_open()) return false;
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), "DELETE FROM notes WHERE id = ? AND user_id = ?;", -1, &stmt, nullptr) != SQLITE_OK) return false;
    sqlite3_bind_int(stmt, 1, id);
    sqlite3_bind_int(stmt, 2, user_id);
    int rc = sqlite3_step(stmt);
    int changes = sqlite3_changes(as_sqlite(db_handle_));
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE && changes > 0);
}

std::vector<RoutineBlock> Database::get_routine_blocks(int user_id, const std::string& date_filter) {
    std::vector<RoutineBlock> list;
    if (!is_open()) return list;

    std::string sql = "SELECT id, block_date, start_time, end_time, title, category, important, completed FROM routine_blocks WHERE user_id = ?";
    if (!date_filter.empty()) {
        sql += " AND block_date = ?";
    }
    sql += " ORDER BY start_time ASC, id ASC;";

    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), sql.c_str(), -1, &stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_int(stmt, 1, user_id);
        if (!date_filter.empty()) {
            sqlite3_bind_text(stmt, 2, date_filter.c_str(), -1, SQLITE_TRANSIENT);
        }
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            RoutineBlock rb;
            rb.id = sqlite3_column_int(stmt, 0);
            const unsigned char* bd = sqlite3_column_text(stmt, 1);
            rb.block_date = bd ? reinterpret_cast<const char*>(bd) : "";
            const unsigned char* st = sqlite3_column_text(stmt, 2);
            rb.start_time = st ? reinterpret_cast<const char*>(st) : "09:00";
            const unsigned char* et = sqlite3_column_text(stmt, 3);
            rb.end_time = et ? reinterpret_cast<const char*>(et) : "10:00";
            const unsigned char* ti = sqlite3_column_text(stmt, 4);
            rb.title = ti ? reinterpret_cast<const char*>(ti) : "";
            const unsigned char* ca = sqlite3_column_text(stmt, 5);
            rb.category = ca ? reinterpret_cast<const char*>(ca) : "routine";
            rb.important = sqlite3_column_int(stmt, 6) != 0;
            rb.completed = sqlite3_column_int(stmt, 7) != 0;
            list.push_back(std::move(rb));
        }
    }
    if (stmt) sqlite3_finalize(stmt);
    return list;
}

bool Database::create_routine_block(
    int user_id,
    const std::string& block_date,
    const std::string& start_time,
    const std::string& end_time,
    const std::string& title,
    const std::string& category,
    bool important,
    RoutineBlock& out_block
) {
    if (!is_open() || block_date.empty() || title.empty()) return false;

    std::string st = start_time.empty() ? "09:00" : start_time;
    std::string et = end_time.empty() ? "10:00" : end_time;
    std::string cat = category.empty() ? "routine" : category;

    const char* sql = R"(
        INSERT INTO routine_blocks (user_id, block_date, start_time, end_time, title, category, important, completed)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0);
    )";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), sql, -1, &stmt, nullptr) != SQLITE_OK) return false;

    sqlite3_bind_int(stmt, 1, user_id);
    sqlite3_bind_text(stmt, 2, block_date.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, st.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, et.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 5, title.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 6, cat.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 7, important ? 1 : 0);

    bool ok = (sqlite3_step(stmt) == SQLITE_DONE);
    sqlite3_finalize(stmt);
    if (!ok) return false;

    out_block.id = static_cast<int>(sqlite3_last_insert_rowid(as_sqlite(db_handle_)));
    out_block.block_date = block_date;
    out_block.start_time = st;
    out_block.end_time = et;
    out_block.title = title;
    out_block.category = cat;
    out_block.important = important;
    out_block.completed = false;
    return true;
}

bool Database::toggle_routine_block(int user_id, int id, bool& out_completed) {
    if (!is_open()) return false;

    sqlite3_stmt* sel = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), "SELECT completed FROM routine_blocks WHERE id = ? AND user_id = ?;", -1, &sel, nullptr) != SQLITE_OK) return false;
    sqlite3_bind_int(sel, 1, id);
    sqlite3_bind_int(sel, 2, user_id);
    bool found = false;
    bool cur = false;
    if (sqlite3_step(sel) == SQLITE_ROW) {
        found = true;
        cur = sqlite3_column_int(sel, 0) != 0;
    }
    sqlite3_finalize(sel);
    if (!found) return false;

    out_completed = !cur;
    sqlite3_stmt* upd = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), "UPDATE routine_blocks SET completed = ? WHERE id = ? AND user_id = ?;", -1, &upd, nullptr) != SQLITE_OK) return false;
    sqlite3_bind_int(upd, 1, out_completed ? 1 : 0);
    sqlite3_bind_int(upd, 2, id);
    sqlite3_bind_int(upd, 3, user_id);
    bool ok = (sqlite3_step(upd) == SQLITE_DONE);
    sqlite3_finalize(upd);
    return ok;
}

bool Database::delete_routine_block(int user_id, int id) {
    if (!is_open()) return false;
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(as_sqlite(db_handle_), "DELETE FROM routine_blocks WHERE id = ? AND user_id = ?;", -1, &stmt, nullptr) != SQLITE_OK) return false;
    sqlite3_bind_int(stmt, 1, id);
    sqlite3_bind_int(stmt, 2, user_id);
    int rc = sqlite3_step(stmt);
    int changes = sqlite3_changes(as_sqlite(db_handle_));
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE && changes > 0);
}

DashboardSummary Database::get_summary(int user_id, const std::string& today_date) {
    DashboardSummary s{};
    if (!is_open()) return s;

    auto tasks = get_all_tasks(user_id, today_date);
    s.total = static_cast<int>(tasks.size());
    for (const auto& t : tasks) {
        if (t.completed) {
            s.completed++;
        } else if (!t.due_at.empty() && t.due_at < today_date) {
            s.overdue++;
        } else {
            s.pending++;
        }
    }
    s.completion_rate = (s.total > 0) ? (s.completed * 100) / s.total : 0;

    std::string week_start = shift_date(today_date, -6);
    sqlite3_stmt* f_stmt = nullptr;
    if (sqlite3_prepare_v2(
            as_sqlite(db_handle_),
            "SELECT COALESCE(SUM(CASE WHEN session_date = ? THEN duration_minutes ELSE 0 END), 0), "
            "COALESCE(SUM(CASE WHEN session_date >= ? AND session_date <= ? THEN duration_minutes ELSE 0 END), 0) "
            "FROM focus_sessions WHERE user_id = ?;",
            -1,
            &f_stmt,
            nullptr) == SQLITE_OK) {
        sqlite3_bind_text(f_stmt, 1, today_date.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(f_stmt, 2, week_start.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(f_stmt, 3, today_date.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(f_stmt, 4, user_id);
        if (sqlite3_step(f_stmt) == SQLITE_ROW) {
            s.today_focus_minutes = sqlite3_column_int(f_stmt, 0);
            s.week_focus_minutes = sqlite3_column_int(f_stmt, 1);
        }
        sqlite3_finalize(f_stmt);
    }

    auto habits = get_habits(user_id, today_date);
    s.habits_total = static_cast<int>(habits.size());
    for (const auto& h : habits) {
        if (h.completed_today) s.habits_done_today++;
    }

    int focus_pct = std::min(100, (s.today_focus_minutes * 100) / 60);
    int habit_pct = (s.habits_total > 0) ? (s.habits_done_today * 100) / s.habits_total : 0;
    s.flow_score = (s.completion_rate * 50 + focus_pct * 30 + habit_pct * 20) / 100;

    for (int offset = -6; offset <= 0; ++offset) {
        std::string day = shift_date(today_date, offset);
        DayMetric dm;
        dm.date = day;
        dm.label = weekday_short(day);

        sqlite3_stmt* d_stmt = nullptr;
        if (sqlite3_prepare_v2(
                as_sqlite(db_handle_),
                "SELECT "
                "(SELECT COUNT(*) FROM tasks WHERE user_id = ? AND completed = 1 AND completed_at = ?), "
                "(SELECT COALESCE(SUM(duration_minutes), 0) FROM focus_sessions WHERE user_id = ? AND session_date = ?);",
                -1,
                &d_stmt,
                nullptr) == SQLITE_OK) {
            sqlite3_bind_int(d_stmt, 1, user_id);
            sqlite3_bind_text(d_stmt, 2, day.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_int(d_stmt, 3, user_id);
            sqlite3_bind_text(d_stmt, 4, day.c_str(), -1, SQLITE_TRANSIENT);
            if (sqlite3_step(d_stmt) == SQLITE_ROW) {
                dm.completed_tasks = sqlite3_column_int(d_stmt, 0);
                dm.focus_minutes = sqlite3_column_int(d_stmt, 1);
            }
            sqlite3_finalize(d_stmt);
        }

        int day_activity = std::min(100, dm.completed_tasks * 20 + dm.focus_minutes);
        dm.score = (day == today_date) ? s.flow_score : day_activity;
        s.weekly.push_back(std::move(dm));
    }

    return s;
}