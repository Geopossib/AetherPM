use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

/// Wraps a single SQLite connection behind a mutex. SQLite handles one
/// writer at a time anyway, and this app is single-process, so a mutex
/// is simpler and safer than a full connection pool for v1.
pub struct Db(pub Mutex<Connection>);

const MIGRATIONS: &[(&str, &str)] = &[
    ("0001_init", include_str!("migrations/0001_init.sql")),
    ("0002_phase3", include_str!("migrations/0002_phase3.sql")),
    ("0003_phase5", include_str!("migrations/0003_phase5.sql")),
    ("0004_phase6", include_str!("migrations/0004_phase6.sql")),
    ("0005_phase7", include_str!("migrations/0005_phase7.sql")),
];

/// Resolves the on-disk location for the app's SQLite file:
/// ~/.local/share/aetherpm/aetherpm.db (Linux), matching platform
/// equivalents on macOS/Windows via the `dirs` crate.
pub fn db_path() -> PathBuf {
    let mut dir = dirs::data_dir().expect("could not resolve platform data directory");
    dir.push("aetherpm");
    std::fs::create_dir_all(&dir).expect("could not create app data directory");
    dir.push("aetherpm.db");
    dir
}

pub fn init_db() -> Db {
    let conn = Connection::open(db_path()).expect("failed to open SQLite database");
    conn.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")
        .expect("failed to set SQLite pragmas");

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);",
    )
    .expect("failed to create migrations table");

    for (name, sql) in MIGRATIONS {
        let already_applied: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM _migrations WHERE name = ?1",
                [name],
                |row| row.get::<_, i64>(0),
            )
            .map(|count| count > 0)
            .unwrap_or(false);

        if !already_applied {
            conn.execute_batch(sql)
                .unwrap_or_else(|e| panic!("migration {name} failed: {e}"));
            conn.execute(
                "INSERT INTO _migrations (name, applied_at) VALUES (?1, ?2)",
                rusqlite::params![name, chrono::Utc::now().to_rfc3339()],
            )
            .expect("failed to record migration");
        }
    }

    Db(Mutex::new(conn))
}
