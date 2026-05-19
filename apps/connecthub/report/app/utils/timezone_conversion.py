"""
Timezone conversion utilities for handling date/time conversions between 
IST (Indian Standard Time) and various account timezones.
"""

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import re

# IST timezone constant
IST_TZ = ZoneInfo("Asia/Kolkata")


def convert_account_tz_to_ist(dt, account_tz: str) -> datetime | None:
    """
    Convert a datetime from account timezone TO IST for database filtering.
    
    This function is used when users provide filter dates in their local timezone,
    and we need to convert them to IST for querying the database (which stores dates in IST).
    
    Args:
        dt: DateTime object or string in format 'YYYY-MM-DD HH:MM:SS'
        account_tz: Timezone string in format 'UTC+HH:MM', 'UTC-HH:MM', or named timezone like 'America/New_York'
    
    Returns:
        Naive datetime in IST timezone, or None if conversion fails
        
    Examples:
        >>> convert_account_tz_to_ist("2026-01-02 00:00:00", "UTC+12:00")
        datetime(2026, 1, 1, 17, 30, 0)  # IST
        
        >>> convert_account_tz_to_ist("2026-01-02 09:00:00", "America/New_York")
        datetime(2026, 1, 2, 19, 30, 0)  # IST
    """
    if not dt:
        return None
    
    # STEP 1: Convert string → datetime
    if isinstance(dt, str):
        dt = dt.strip()
        try:
            dt = datetime.fromisoformat(dt)
        except ValueError:
            try:
                dt = datetime.strptime(dt, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                return None
    
    # STEP 2: Parse the account timezone and attach to datetime
    account_tz = account_tz.replace(" ", "")  # Remove any spaces
    
    # Handle UTC offsets like UTC+12:00 or UTC-02:00
    match = re.match(r"UTC([+-])(\d{1,2}):(\d{2})$", account_tz)
    if match:
        sign, hours, minutes = match.groups()
        offset_minutes = int(hours) * 60 + int(minutes)
        if sign == "-":
            offset_minutes = -offset_minutes
        
        # Create a fixed offset timezone
        tz = timezone(timedelta(minutes=offset_minutes))
        
        # Attach this timezone to the naive datetime
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=tz)
    else:
        # Named timezones like Asia/Tokyo, America/New_York, Europe/London
        try:
            tz = ZoneInfo(account_tz)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=tz)
        except Exception:
            # Invalid timezone - return None
            return None
    
    # STEP 3: Convert to IST
    dt_ist = dt.astimezone(IST_TZ)
    
    # Return as naive datetime (since DB stores naive IST datetimes)
    return dt_ist.replace(tzinfo=None)


def convert_ist_to_account_tz(dt, account_tz: str) -> str | None:
    """
    Convert a datetime from IST TO account timezone for display.
    
    This function is used when displaying dates to users in their local timezone.
    Database stores dates in IST, so we convert them to the user's timezone for display.
    
    Args:
        dt: DateTime object or string in IST timezone
        account_tz: Target timezone string in format 'UTC+HH:MM', 'UTC-HH:MM', or named timezone
    
    Returns:
        Formatted datetime string in account timezone (YYYY-MM-DD HH:MM:SS), or None if conversion fails
        
    Examples:
        >>> convert_ist_to_account_tz("2026-01-02 07:00:00", "UTC+12:00")
        "2026-01-02 12:30:00"
        
        >>> convert_ist_to_account_tz(datetime(2026, 1, 2, 7, 0, 0), "America/New_York")
        "2026-01-01 20:30:00"
    """
    if not dt:
        return None
    
    # STEP 1: Convert string → datetime
    if isinstance(dt, str):
        dt = dt.strip()
        try:
            dt = datetime.fromisoformat(dt)
        except ValueError:
            try:
                dt = datetime.strptime(dt, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                # Unrecognized format - return as-is
                return dt
    
    # STEP 2: Attach IST timezone if datetime is naive (DB dates are naive IST)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST_TZ)
    
    # Normalize timezone string
    account_tz = account_tz.replace(" ", "")
    
    # STEP 3: Handle UTC offsets like UTC+12:00
    match = re.match(r"UTC([+-])(\d{1,2}):(\d{2})$", account_tz)
    if match:
        sign, hours, minutes = match.groups()
        offset_minutes = int(hours) * 60 + int(minutes)
        if sign == "-":
            offset_minutes = -offset_minutes
        
        target_tz = timezone(timedelta(minutes=offset_minutes))
        dt = dt.astimezone(target_tz)
    else:
        # Named timezones like Asia/Tokyo, America/New_York
        try:
            dt = dt.astimezone(ZoneInfo(account_tz))
        except Exception:
            # If invalid timezone, return formatted string in original timezone
            return dt.strftime("%Y-%m-%d %H:%M:%S")
    
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def get_timezone_offset_hours(account_tz: str) -> float | None:
    """
    Get the UTC offset in hours for a given timezone.
    
    Args:
        account_tz: Timezone string
        
    Returns:
        Offset in hours (can be negative), or None if invalid
        
    Examples:
        >>> get_timezone_offset_hours("UTC+12:00")
        12.0
        
        >>> get_timezone_offset_hours("UTC-05:30")
        -5.5
        
        >>> get_timezone_offset_hours("America/New_York")
        -5.0  # (varies with DST)
    """
    try:
        account_tz = account_tz.replace(" ", "")
        
        # Handle UTC offsets
        match = re.match(r"UTC([+-])(\d{1,2}):(\d{2})$", account_tz)
        if match:
            sign, hours, minutes = match.groups()
            offset_hours = int(hours) + int(minutes) / 60
            return offset_hours if sign == "+" else -offset_hours
        
        # Named timezones - get current offset
        tz = ZoneInfo(account_tz)
        now = datetime.now(tz)
        offset_seconds = now.utcoffset().total_seconds()
        return offset_seconds / 3600
    except Exception:
        return None


def validate_timezone(account_tz: str) -> bool:
    """
    Validate if a timezone string is valid.
    
    Args:
        account_tz: Timezone string to validate
        
    Returns:
        True if valid, False otherwise
        
    Examples:
        >>> validate_timezone("UTC+12:00")
        True
        
        >>> validate_timezone("Invalid/Timezone")
        False
    """
    try:
        account_tz = account_tz.replace(" ", "")
        
        # Check UTC offset format
        match = re.match(r"UTC([+-])(\d{1,2}):(\d{2})$", account_tz)
        if match:
            sign, hours, minutes = match.groups()
            h, m = int(hours), int(minutes)
            # Valid range: UTC-12:00 to UTC+14:00
            return -12 <= (h if sign == "-" else h) <= 14 and 0 <= m < 60
        
        # Check named timezone
        ZoneInfo(account_tz)
        return True
    except Exception:
        return False