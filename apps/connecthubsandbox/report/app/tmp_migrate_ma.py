import pymysql

try:
    connection = pymysql.connect(
        host='pulsedb-feb29.cluster-cia2xris1iid.ap-south-1.rds.amazonaws.com',
        user='admin',
        password='#Pulse#$2024',
        database='onedb',
        cursorclass=pymysql.cursors.DictCursor
    )

    with connection.cursor() as cursor:
        print("Connected to database")
        
        # Add ma_extensionFilter
        try:
            sql = "ALTER TABLE p_mailAutomation ADD COLUMN ma_extensionFilter JSON DEFAULT NULL AFTER ma_status"
            cursor.execute(sql)
            print("Added ma_extensionFilter")
        except Exception as e:
            print(f"ma_extensionFilter error: {e}")

        # Add ma_timezoneFilter
        try:
            sql = "ALTER TABLE p_mailAutomation ADD COLUMN ma_timezoneFilter VARCHAR(100) DEFAULT NULL AFTER ma_extensionFilter"
            cursor.execute(sql)
            print("Added ma_timezoneFilter")
        except Exception as e:
            print(f"ma_timezoneFilter error: {e}")

        # Add ma_fieldsFilter
        try:
            sql = "ALTER TABLE p_mailAutomation ADD COLUMN ma_fieldsFilter JSON DEFAULT NULL AFTER ma_timezoneFilter"
            cursor.execute(sql)
            print("Added ma_fieldsFilter")
        except Exception as e:
            print(f"ma_fieldsFilter error: {e}")

    connection.commit()
    print("Migration finished")
except Exception as e:
    print(f"Outer exception: {e}")
finally:
    if 'connection' in locals():
        connection.close()
