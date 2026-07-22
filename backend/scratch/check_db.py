from sqlalchemy import text
from app.core.base_de_datos import engine

def check_db():
    print(f"Connecting to database url: {engine.url}")
    with engine.connect() as conexion:
        # List tables
        try:
            res = conexion.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'"))
            tables = [row[0] for row in res.fetchall()]
            print("PostgreSQL Tables:", tables)
            for t in tables:
                res_count = conexion.execute(text(f"SELECT COUNT(*) FROM {t}"))
                count = res_count.fetchone()[0]
                print(f"  Table '{t}' has {count} rows")
        except Exception as e:
            print("PostgreSQL Table query failed, trying SQLite...", e)
            try:
                res = conexion.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
                tables = [row[0] for row in res.fetchall()]
                print("SQLite Tables:", tables)
                for t in tables:
                    res_count = conexion.execute(text(f"SELECT COUNT(*) FROM {t}"))
                    count = res_count.fetchone()[0]
                    print(f"  Table '{t}' has {count} rows")
            except Exception as e2:
                print("SQLite query failed too:", e2)

if __name__ == "__main__":
    check_db()
