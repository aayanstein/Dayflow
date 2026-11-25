#pragma once

#include <string>
#include <vector>

struct User {
    int id = 0;
    std::string name;
    std::string email;
    std::string provider;
};

struct Task {
    int id;
    std::string title;
    bool completed;
    std::string priority;
    std::string due_at;
    std::string completed_at;
};

struct FocusSession {
    int id;
    std::string task_title;
    int duration_minutes;
    std::string session_date;
};

struct Habit {
    int id;
    std::string title;
    bool completed_today;
    int week_count;
};

struct NoteEntry {
    int id;
    std::string note_date; // YYYY-MM-DD
    std::string title;
    std::string content;
    std::string updated_at;
};

struct RoutineBlock {
    int id;
    std::string block_date; // YYYY-MM-DD
    std::string start_time; // HH:MM
    std::string end_time;   // HH:MM
    std::string title;
    std::string category;   // routine | focus | meeting | important
    bool important;
    bool completed;
};

struct DayMetric {
    std::string date;
    std::string label;
    int completed_tasks;
    int focus_minutes;
    int score;
};

struct DashboardSummary {
    int total;
    int completed;
    int pending;
    int overdue;
    int completion_rate;
    int today_focus_minutes;
    int week_focus_minutes;
    int habits_done_today;
    int habits_total;
    int flow_score;
    std::vector<DayMetric> weekly;
};

class Database {
public:
    explicit Database(const std::string& db_path);
    ~Database();

    bool is_open() const;
    bool init_schema();

    // Auth & Sessions
    bool register_user(const std::string& name, const std::string& email, const std::string& password, User& out_user, std::string& out_error);
    bool login_user(const std::string& email, const std::string& password, User& out_user, std::string& out_error);
    bool oauth_login_or_create(const std::string& provider, const std::string& name, const std::string& email, User& out_user, std::string& out_error);
    std::string create_session(int user_id);
    bool get_user_by_token(const std::string& token, User& out_user);
    bool delete_session(const std::string& token);

    // User-scoped data operations
    std::vector<Task> get_all_tasks(int user_id, const std::string& today_date);
    bool create_task(int user_id, const std::string& title, const std::string& priority, const std::string& due_at, Task& out_task);
    bool update_task(
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
    );
    bool delete_task(int user_id, int id);

    bool log_focus_session(int user_id, const std::string& task_title, int duration_minutes, const std::string& today_date, FocusSession& out_session);

    std::vector<Habit> get_habits(int user_id, const std::string& today_date);
    bool create_habit(int user_id, const std::string& title, Habit& out_habit);
    bool toggle_habit(int user_id, int id, const std::string& today_date, bool& out_completed);
    bool delete_habit(int user_id, int id);

    std::vector<NoteEntry> get_notes(int user_id);
    bool save_note(int user_id, const std::string& note_date, const std::string& title, const std::string& content, NoteEntry& out_note);
    bool delete_note(int user_id, int id);

    std::vector<RoutineBlock> get_routine_blocks(int user_id, const std::string& date_filter);
    bool create_routine_block(
        int user_id,
        const std::string& block_date,
        const std::string& start_time,
        const std::string& end_time,
        const std::string& title,
        const std::string& category,
        bool important,
        RoutineBlock& out_block
    );
    bool toggle_routine_block(int user_id, int id, bool& out_completed);
    bool delete_routine_block(int user_id, int id);

    DashboardSummary get_summary(int user_id, const std::string& today_date);

private:
    void* db_handle_ = nullptr;
    bool open_ = false;
};