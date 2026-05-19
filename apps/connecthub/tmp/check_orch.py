import asyncio
import os
import sys
from datetime import datetime
from bson import ObjectId
from sqlalchemy import select

# Add parent directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'telephony/app')))

from telephony.app.repos.emergency_repo import EmergencyRepo
from telephony.app.models.db import EmergencyCampaign

async def main():
    repo = EmergencyRepo('onedb_proxy')
    async with repo.async_session_maker() as s_session:
        # Find the latest campaign for account 368
        stmt = select(EmergencyCampaign).where(EmergencyCampaign.e_accountId == 368).order_by(EmergencyCampaign.e_createdOn.desc()).limit(1)
        res = await s_session.execute(stmt)
        camp = res.scalar_one_or_none()
        
        if camp:
            print(f"CAMPAIGN ID: {camp.e_campaignId}")
            print(f"ORCHESTRATION ID: {camp.e_orchestrationId}")
            
            if camp.e_orchestrationId:
                orch = await repo.mongo_db.orchestrations.find_one({"_id": ObjectId(camp.e_orchestrationId)})
                if orch:
                    # Print relevant parts of orchestration
                    print(f"ORCHESTRATION KEYS: {list(orch.keys())}")
                    if "data" in orch:
                        data = orch["data"]
                        if isinstance(data, dict):
                            print(f"DATA KEYS: {list(data.keys())}")
                            if "stages" in data:
                                print(f"STAGES COUNT: {len(data['stages'])}")
                                for idx, stage in enumerate(data['stages']):
                                    print(f"STAGE {idx} CONFIG: {stage.get('config', {}).get('ivr', {})}")
                        else:
                            print(f"DATA IS NOT DICT: {type(data)}")
                else:
                    print("ORCHESTRATION NOT FOUND IN MONGO")

if __name__ == "__main__":
    asyncio.run(main())
