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

        if not member_extension_no:
            return "<!-- No rows found -->"
        
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
            print(stmt.compile(dialect=mysql.dialect(), compile_kwargs={"literal_binds": True}))
        else:
            stmt = (
                select(
                    Members.m_memberName,
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



async def internal(campaign_id: int, database: str, member_extension_no: str = None):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:

        if not member_extension_no:
            return "<!-- No rows found -->"
        
        # if campaign_id == 0:
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
                Members.m_accountId,
                Members.m_accountNo,
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
            .filter(Members.m_memberExtensionNo == member_extension_no)
        )
            # You can later add:
            # stmt = stmt.join(Callflows, CLINumbers.c_callflowId == Callflows.cf_callflowId, isouter=True)

        print(stmt.compile(dialect=mysql.dialect(), compile_kwargs={"literal_binds": True}))
        
        result = await session.execute(stmt)
        return result.mappings().all()  # return dict-like rows




async def get_inbound_data(campaign_id: int, database: str, clinumber: str = None):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
            print(clinumber)
            stmt = (select(CLINumbers.c_accountId,CLINumbers.c_accountNo,CLINumbers.c_clinumberId,Accounts.a_planDetails)
            .join(Accounts, Accounts.a_accountId == CLINumbers.c_accountId, isouter=True)
            .where(or_(CLINumbers.c_clinumberName == clinumber,CLINumbers.c_clinumberName == clinumber[-10:],CLINumbers.c_clinumberName == clinumber[-9:],CLINumbers.c_clinumberName == clinumber[-8:])))
            print(stmt.compile(compile_kwargs={"literal_binds": True}))
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
                Members.m_campaignId,
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
        # Or just:
    print(stmt.compile(dialect=mysql.dialect(), compile_kwargs={"literal_binds": True}))
        # You can later add:
        # stmt = stmt.join(Callflows, CLINumbers.c_callflowId == Callflows.cf_callflowId, isouter=True)

    result = await session.execute(stmt)
    return result.mappings().all()  # return dict-like rows

async def getAgentDetails(member_extension_no: str, database: str):
    print(f"[DEBUG] getAgentDetails() called with member_extension_no={member_extension_no}, database={database}")

    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:
        stmt = (
            select(Members.m_accountNo)
            .where(Members.m_memberExtensionNo == member_extension_no)
            .limit(1)
        )
        print(f"[DEBUG] SQLAlchemy Query: {stmt}")
        result = await session.execute(stmt)
        row = result.mappings().first()

        print(f"[DEBUG] Query Result: {row}")
        return row  # dict-like result or None


async def get_campaignidbyextension(database: str, member_extension_no: str):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:

        stmt = (
            select(Members.m_campaignId)
            .where(Members.m_memberExtensionNo == member_extension_no)
        )

        print(stmt.compile(
            dialect=mysql.dialect(),
            compile_kwargs={"literal_binds": True}
        ))

        result = await session.execute(stmt)
        row = result.fetchone()

        return row[0] if row else None



async def customer_cli(campaign_id: int, database: str,caller_id_no: str, account_id: str, member_extension_no: str = None):
    sessionmaker = asyncSessionFactory(database)
    async with sessionmaker() as session:

        if not member_extension_no:
            return "<!-- No rows found -->"
        
        if campaign_id == 0:
            print("ok")
            if member_extension_no is None:
                raise ValueError("member_extension_no is required when campaign_id is 0")
            caller_id_no = caller_id_no.replace(" ", "").strip()[-10:]
            stmt = (
                select(
                    CLINumbers.c_clinumberId,
                    CLINumbers.c_accountId,
                    CLINumbers.c_accountNo,
                    CLINumbers.c_accountPrefix,
                    CLINumbers.c_clinumberName,
                    CLINumbers.c_clinumberType,
                    CLINumbers.c_clinumberCountryCode,
                    CLINumbers.c_clinumberCountryName,
                    CLINumbers.c_clinumberStatus,
                    CLINumbers.c_clinumbermapName,
                    CLINumbers.c_callflowId,
                    CLINumbers.c_callflowName,
                    CLINumbers.c_peerId,
                    CLINumbers.c_createdOn.label('cli_createdOn'),
                    CLINumbers.c_updatedOn.label('cli_updatedOn'),
                    Peers.p_peerId,
                    Peers.p_peerName,
                    Peers.p_peerSecret,
                    Peers.p_peerHost,
                    Peers.p_peerPort,
                    Peers.p_peerPrefix,
                    Peers.p_peerPilotno,
                    Peers.p_peerOutboundPrefix,
                    Peers.p_peerInboundPrefix,
                    Peers.p_proxyId,
                    Peers.p_proxyName,
                    Peers.p_createdOn.label('peer_createdOn'),
                    Peers.p_updatedOn.label('peer_updatedOn')
                )
                .join(
                    Peers,
                    Peers.p_peerId == CLINumbers.c_peerId,
                    isouter=True
                )
                .filter(
                    CLINumbers.c_accountId == account_id,
                    CLINumbers.c_clinumberName == caller_id_no
                )
            )

            # You can later add:
            # stmt = stmt.join(Callflows, CLINumbers.c_callflowId == Callflows.cf_callflowId, isouter=True)
            print(stmt.compile(dialect=mysql.dialect(), compile_kwargs={"literal_binds": True}))
        
        result = await session.execute(stmt)
        return result.mappings().all()  # return dict-like rows

