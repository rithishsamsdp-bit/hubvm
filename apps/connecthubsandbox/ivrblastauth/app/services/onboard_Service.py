from repos import onboard_repo
import base64
import hashlib

def onboarding_CustomerService(cust_Detials: dict,database: str):
    
    response = onboard_repo.create_cust(cust_Detials,database)
    return response
    
def encriptionencoder(reg_id: int):
    reg_id_base = base64.b64encode(str(reg_id).encode()).decode()
    reg_ide = reg_id_base + "pulse" + str(reg_id)
    final_req = hashlib.md5(reg_ide.encode()).hexdigest()
    return final_req
    

    