from ftplib import FTP
import os
from dotenv import load_dotenv

load_dotenv()
TEMP_DIR = "tempFiles"

FTP_HOST = os.getenv("FTP_HOST", "13.232.198.50")
FTP_USER = os.getenv("FTP_USER", "your_username")
FTP_PASS = os.getenv("FTP_PASS", "your_password")
FTP_PATH = os.getenv("FTP_PATH", "/usr/local/freeswitch/conf/sip_profiles/external")

os.makedirs(TEMP_DIR, exist_ok=True)

def upload_file_ftp(local_filepath: str, remote_filename: str):
    try:
        ftp = FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        ftp.cwd(FTP_PATH)

        with open(local_filepath, "rb") as file:
            ftp.storbinary(f"STOR {remote_filename}", file)

        ftp.quit()

        os.remove(local_filepath)

        return {"message": f"File {remote_filename} uploaded successfully"}
    except Exception as e:
        return {"error": str(e)}

def delete_file_ftp(remote_filename: str):
    try:
        ftp = FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        ftp.cwd(FTP_PATH)

        ftp.delete(remote_filename)

        ftp.quit()
        return {"message": f"File {remote_filename} deleted successfully"}
    except Exception as e:
        return {"error": str(e)}

def create_and_upload_xml(filename: str, content: str):
    try:
        local_filepath = os.path.join(TEMP_DIR, filename)

        ftp = FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        ftp.cwd(FTP_PATH)

        existing_files = ftp.nlst()
        if filename in existing_files:
            ftp.delete(filename)

        ftp.quit()

        with open(local_filepath, "w") as xml_file:
            xml_file.write(content)

        return upload_file_ftp(local_filepath, filename)
    except Exception as e:
        return {"error": str(e)}

def delete_xml_from_server(filename: str):
    return delete_file_ftp(filename)
