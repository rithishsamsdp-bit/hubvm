from repos import delivery_response_repo

async def fetch_delivery_response_report(limit: int, offset: int, searchString: str, start_date: str, end_date: str, sortField: str, sortOrder: str, status: str, direction: str, accountId: str, accountNo: str):
    
    response = delivery_response_repo.fetch_delivery_response_report(limit, offset, searchString, start_date, end_date, sortField, sortOrder, status, direction, accountId, accountNo)
    
    return response
