from sqlalchemy import Delete, Update, select, func, or_, and_, literal_column, literal
from sqlalchemy.orm import sessionmaker,Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException
from db.context import asyncSessionFactory
from models.db import CdrLogs, Campaigns, DidNumberGroup, RelationalDidnumbersGroups, PRelationalTableCampaignsDidNumberGroups,CLINumbers, Peers, Members, RelationalCLINumbersMembers,Accounts
import os
from sqlalchemy.dialects import mysql

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


