import asyncio
from sqlalchemy import text
from db.context import get_async_writer_engine

async def migrate():
    # Attempt to use 'onedb' which was in the previous error parameters
    db_name = 'onedb'
    print(f"Connecting to {db_name}...")
    engine = get_async_writer_engine(db_name)
    async with engine.begin() as conn:
        print("Connected to database")
        
        # Add ma_extensionFilter
        try:
            sql = "ALTER TABLE p_mailAutomation ADD COLUMN ma_extensionFilter JSON DEFAULT NULL AFTER ma_status"
            await conn.execute(text(sql))
            print("Added ma_extensionFilter")
        except Exception as e:
            print(f"ma_extensionFilter error: {e}")

        # Add ma_timezoneFilter
        try:
            sql = "ALTER TABLE p_mailAutomation ADD COLUMN ma_timezoneFilter VARCHAR(100) DEFAULT NULL AFTER ma_extensionFilter"
            await conn.execute(text(sql))
            print("Added ma_timezoneFilter")
        except Exception as e:
            print(f"ma_timezoneFilter error: {e}")

        # Add ma_fieldsFilter
        try:
            sql = "ALTER TABLE p_mailAutomation ADD COLUMN ma_fieldsFilter JSON DEFAULT NULL AFTER ma_timezoneFilter"
            await conn.execute(text(sql))
            print("Added ma_fieldsFilter")
        except Exception as e:
            print(f"ma_fieldsFilter error: {e}")

    await engine.dispose()
    print("Migration finished")

if __name__ == "__main__":
    asyncio.run(migrate())
