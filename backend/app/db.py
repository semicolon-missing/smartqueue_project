import os

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://smartqueue:smartqueue@localhost:5433/smartqueue")

pool = ConnectionPool(
    DATABASE_URL,
    min_size=1,
    max_size=3,
    check=ConnectionPool.check_connection,
    kwargs={"row_factory": dict_row, "prepare_threshold": None},
    open=False,
)


def query(sql, params=None):
    with pool.connection() as conn:
        return conn.execute(sql, params).fetchall()


def query_one(sql, params=None):
    with pool.connection() as conn:
        return conn.execute(sql, params).fetchone()


def copy_csv(select_sql):
    with pool.connection() as conn:
        with conn.cursor().copy(f"COPY ({select_sql}) TO STDOUT WITH CSV HEADER") as copy:
            return b"".join(copy)
