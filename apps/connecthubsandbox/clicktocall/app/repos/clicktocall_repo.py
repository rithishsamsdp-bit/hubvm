from sqlalchemy import Delete, Update, select, func, or_, and_, literal_column, literal
from sqlalchemy.orm import sessionmaker,Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException
from db.context import asyncSessionFactory
from models.db import CdrLogs, Campaigns, DidNumberGroup, RelationalDidnumbersGroups, PRelationalTableCampaignsDidNumberGroups,CLINumbers, Peers, Members, RelationalCLINumbersMembers,Accounts, ApiRequestLogs, ApiResponseLogs, MediaInstances, RelationalProxyInstancesAccounts, ProxyInstances
import os
from sqlalchemy.dialects import mysql
from fastapi import Request
import json
from typing import Any
import random


async def get_campaign_data(campaign_id: int, database: str, member_extension_no: str = None):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:

        if campaign_id == 0:
            print("ok")
            if member_extension_no is None:
                raise ValueError("member_extension_no is required when campaign_id is 0")
            
            stmt = (
                select(
                    Members.m_memberName,
                    Members.m_memberPassword,
                    Members.m_memberExtensionNo,
                    Members.m_memberCallerId,
                    Members.m_memberCallerIdMode,
                    Members.m_clicktocallType,
                    Members.m_memberMobileNo,
                    CLINumbers.c_accountId,
                    CLINumbers.c_accountNo,
                    CLINumbers.c_accountPrefix,
                    CLINumbers.c_clinumberCountryCode,
                    CLINumbers.c_clinumberName,
                    CLINumbers.c_clinumberType,
                    CLINumbers.c_clinumberCountryCode,
                    CLINumbers.c_clinumberCountryName,
                    CLINumbers.c_clinumberId,
                    CLINumbers.c_apiIntegration,
                    Peers.p_peerName,
                    Peers.p_peerPrefix,
                    Accounts.a_planDetails,
                    literal_column("0").label("c_campaignId"),
                    literal("Individual").label("c_campaignName")   # ✅ fixes error

                )
                .join(
                    RelationalCLINumbersMembers,
                    Members.m_memberId == RelationalCLINumbersMembers.r_memberId,
                    isouter=True
                )
                .join(
                    Accounts,
                    Members.m_accountId == Accounts.a_accountId,
                    isouter=True
                )
                .join(
                    CLINumbers,
                    CLINumbers.c_clinumberId == RelationalCLINumbersMembers.r_clinumberId,
                    isouter=True
                )
                .join(
                    Peers,
                    CLINumbers.c_peerId == Peers.p_peerId
                )
                .filter(Members.m_memberExtensionNo == member_extension_no)
            )
            # You can later add:
            print(stmt.compile(dialect=mysql.dialect(), compile_kwargs={"literal_binds": True}))
        else:
            stmt = (
                select(
                    Campaigns.c_accountNo,
                    Campaigns.c_accountId,
                    Campaigns.c_campaignId,
                    CLINumbers.c_accountId,
                    Members.m_memberCallerId,
                    Members.m_memberCallerIdMode,
                    CLINumbers.c_accountPrefix,
                    CLINumbers.c_clinumberCountryCode,
                    CLINumbers.c_accountNo,
                    Campaigns.c_campaignName,
                    DidNumberGroup.d_didnumbergroupName,
                    CLINumbers.c_clinumberName,
                    CLINumbers.c_clinumberId,
                    Peers.p_peerName,
                    Peers.p_peerPrefix,
                    Accounts.a_planDetails,
                )
                .join(
                    PRelationalTableCampaignsDidNumberGroups,
                    Campaigns.c_campaignId == PRelationalTableCampaignsDidNumberGroups.rcd_campaignsId
                )
                .join(
                    DidNumberGroup,
                    DidNumberGroup.d_didnumbergroupId == PRelationalTableCampaignsDidNumberGroups.rcd_didnumbergroupsId
                )
                .join(
                    RelationalDidnumbersGroups,
                    PRelationalTableCampaignsDidNumberGroups.rcd_didnumbergroupsId == RelationalDidnumbersGroups.r_didnumbergroupId
                )
                .join(
                    Accounts,
                    Campaigns.c_accountId == Accounts.a_accountId,
                    isouter=True
                )
                .join(
                    Members,
                    Members.m_accountId == Accounts.a_accountId,
                    isouter=True
                )
                .join(
                    CLINumbers,
                    CLINumbers.c_clinumberId == RelationalDidnumbersGroups.r_didnumberId
                )
                .join(
                    Peers,
                    CLINumbers.c_peerId == Peers.p_peerId
                )
                .filter(Campaigns.c_campaignId == campaign_id,Members.m_memberExtensionNo == member_extension_no)
            )
                        

        result = await session.execute(stmt)
        return result.mappings().all()  # return dict-like rows





async def get_inbound_data(campaign_id: int, database: str, clinumber: str = None):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
            
            stmt = (
                select(CLINumbers.c_accountId,CLINumbers.c_accountNo,CLINumbers.c_clinumberId,Accounts.a_planDetails)
                 .join(Accounts, Accounts.a_accountId == CLINumbers.c_accountId, isouter=True)
                 .where(CLINumbers.c_clinumberName == 9043992401)
            )
            # You can later add:
            # stmt = stmt.join(Callflows, CLINumbers.c_callflowId == Callflows.cf_callflowId, isouter=True)

    
            result = await session.execute(stmt)
            return result.mappings().all()  # return dict-like rows


async def get_transfer_data(campaign_id: int, database: str, member_extension_no: str = None):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:


        stmt = (
            select(
                Members.m_memberName,
                Members.m_memberPassword,
                Members.m_memberExtensionNo,
                Members.m_memberCallerId,
                Members.m_memberCallerIdMode,
                CLINumbers.c_accountId,
                CLINumbers.c_accountNo,
                CLINumbers.c_accountPrefix,
                CLINumbers.c_clinumberCountryCode,
                CLINumbers.c_clinumberName,
                CLINumbers.c_clinumberType,
                CLINumbers.c_clinumberCountryCode,
                CLINumbers.c_clinumberCountryName,
                CLINumbers.c_clinumberId,
                Peers.p_peerName,
                Peers.p_peerPrefix,
                Accounts.a_planDetails,
                literal_column("0").label("c_campaignId"),
                literal("Individual").label("c_campaignName")   # ✅ fixes error

            )
            .join(
                RelationalCLINumbersMembers,
                Members.m_memberId == RelationalCLINumbersMembers.r_memberId,
                isouter=True
            )
            .join(
                Accounts,
                Members.m_accountId == Accounts.a_accountId,
                isouter=True
            )
            .join(
                CLINumbers,
                CLINumbers.c_clinumberId == RelationalCLINumbersMembers.r_clinumberId,
                isouter=True
            )
            .join(
                Peers,
                CLINumbers.c_peerId == Peers.p_peerId
            )
            .filter(Members.m_memberExtensionNo == member_extension_no)
        )
        # You can later add:
        # stmt = stmt.join(Callflows, CLINumbers.c_callflowId == Callflows.cf_callflowId, isouter=True)

    result = await session.execute(stmt)
    return result.mappings().all()  # return dict-like rows

async def logrequest(request: Request, uuid: str, request_model: Any, database: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as db:
        body_json = None
        try:
            if request_model:
                body_json = request_model.dict() if hasattr(request_model, 'dict') else request_model.model_dump()
        except Exception as e:
            print(f"Error converting request model: {e}")
            body_json = {"error": "Could not serialize request body"}

        req_log = ApiRequestLogs(
            a_uniqueId=uuid,  # This needs to be the UUID string, not the Pydantic model
            a_method=request.method,
            a_endpoint=str(request.url.path),
            a_queryParams=dict(request.query_params),
            a_requestHeaders=dict(request.headers),
            a_requestBody=body_json,
            a_clientIp=request.client.host if request.client else None,
            a_userAgent=request.headers.get("User-Agent"),
        )
        db.add(req_log)
        await db.commit()

        return uuid


async def logresponse(unique_id: str,response_body: dict | str,response_code: int,response_time_ms: int = None,server_node: str = None,extra_meta: dict = None,database: str = "onedb"):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as db:
        resp_log = ApiResponseLogs(
            a_uniqueId=unique_id,
            a_responseCode=response_code,
            a_responseBody=response_body,
            a_responseTimeMs=response_time_ms,
            a_serverNode=server_node,
            a_extraMeta=extra_meta
        )
        db.add(resp_log)
        await db.commit()
        return True

async def getmediaip(accountid: int, database: str):
    try:
        sessionmaker = asyncSessionFactory(database)

        async with sessionmaker() as db:
            stmt = (select(MediaInstances.m_mediaPrivateIPAddress,MediaInstances.m_mediaPublicIPAddress,ProxyInstances.p_proxyPrivateIPAddress,MediaInstances.m_proxyId).join(RelationalProxyInstancesAccounts,MediaInstances.m_proxyId == RelationalProxyInstancesAccounts.r_proxyId).join(ProxyInstances,ProxyInstances.p_proxyId == MediaInstances.m_proxyId).where(RelationalProxyInstancesAccounts.r_accountId == accountid))
            result = await db.execute(stmt)
            rows = result.all()
            if not rows:
                return None
            chosen = random.choice(rows)
            return {
                "media_private_ip": chosen[0],
                "media_public_ip": chosen[1],
                "proxy_private_ip": chosen[2],
                "proxy_id": chosen[3]
            }

    except SQLAlchemyError as db_err:
        raise RuntimeError(
            f"Database error while fetching media/proxy IPs for account {accountid}"
        ) from db_err

    except Exception as exc:
        raise RuntimeError(
            "Unexpected error in getmediaip()"
        ) from exc