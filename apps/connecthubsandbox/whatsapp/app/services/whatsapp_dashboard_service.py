from repos import whatsapp_dashboard_repo

async def fetch_dashboard_stats(accountId, accountNo, startDate, endDate, campaignId, templateId):
    return whatsapp_dashboard_repo.fetch_dashboard_stats(accountId, accountNo, startDate, endDate, campaignId, templateId)
