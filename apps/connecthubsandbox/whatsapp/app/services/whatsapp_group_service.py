import pandas as pd
import io
from repos.whatsapp_group_repo import WhatsappGroupRepo

class WhatsappGroupService:
    def __init__(self):
        self.repo = WhatsappGroupRepo()

    def _normalize_columns(self, df):
        """
        Normalizes column names to standard keys: countryCode, msisdn.
        """
        df.columns = df.columns.str.lower().str.replace(r'[\s_]+', '', regex=True)
        
        rename_map = {}
        for col in df.columns:
            if col in ['countrycode', 'country', 'code']:
                rename_map[col] = 'countryCode'
            elif col in ['mobilenumber', 'mobile', 'phone', 'phonenumber', 'msisdn', 'number']:
                rename_map[col] = 'msisdn'
        
        if rename_map:
            df.rename(columns=rename_map, inplace=True)
            
        return df

    async def create_group(self, file_content, filename, group_name, account_id):
        try:
            if filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file_content), dtype=str)
            elif filename.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(io.BytesIO(file_content), dtype=str)
            else:
                return {"error": "Invalid file format. Only CSV and Excel are supported."}

            df = self._normalize_columns(df)
            
            if 'countryCode' not in df.columns or 'msisdn' not in df.columns:
                 return {"error": "Missing required columns: Country Code, Mobile Number"}
            
            df = df.dropna(subset=['msisdn', 'countryCode'])
            df['countryCode'] = df['countryCode'].astype(str).str.strip()
            df['msisdn'] = df['msisdn'].astype(str).str.strip().str.replace(r'\D', '', regex=True) # Remove non-digits
            
            df = df.drop_duplicates(subset=['countryCode', 'msisdn'])
            
            contacts = df[['countryCode', 'msisdn']].to_dict('records')
            
            final_contacts = []
            for _, row in df.iterrows():
                contact = {
                    "countryCode": row['countryCode'],
                    "msisdn": row['msisdn'],
                    "attributes": {k: v for k, v in row.items() if k not in ['countryCode', 'msisdn']}
                }
                final_contacts.append(contact)

            if not final_contacts:
                return {"error": "No valid contacts found in file."}

            group_id = self.repo.create_group(group_name, account_id, final_contacts)
            
            return {
                "message": "Group created successfully",
                "groupId": group_id,
                "count": len(final_contacts)
            }

        except Exception as e:
            print(f"Error in create_group service: {e}")
            return {"error": str(e)}

    async def get_groups(self, account_id, limit, offset, search_string):
        groups, total = self.repo.get_groups(account_id, limit, offset, search_string)
        return {
            "groups": groups,
            "total": total
        }

    async def get_group_contacts(self, group_id, limit=1000):
        return self.repo.get_group_contacts(group_id, limit)

    async def delete_group(self, group_id, account_id):
        return self.repo.delete_group(group_id, account_id)
