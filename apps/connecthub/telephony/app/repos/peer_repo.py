from fastapi.responses import JSONResponse
from fastapi import status, HTTPException
from sqlalchemy import Update, Delete, select, func, or_, and_
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from db.context import get_async_engine
from services import peer_service
from models.db import Peers, ProxyInstances
# from models.dto import Peerlistdropdown
import asyncio

# async def validator(vtype: str, vvalue: str, m_memberExtensionNo: str, accountEncryption: str, redis_key: str, m_accountId: int, m_accountNo: str,p_peerId: Optional[int] = None):
#     if vtype == "p_peerName":
#         conditions = [
#                     Peers.p_peerName == vvalue
#             ]
#         if p_peerId:
#             conditions.append(Peers.p_peerId != p_peerId)
#         query = select(Peers).where(and_(*conditions))
#         try:
#             async_engine = get_async_engine(accountEncryption)
#             async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
#             session = async_session_maker()
#             result = await session.execute(query)
#             didNumber = result.scalars().first()
#             if didNumber:
#                 return JSONResponse(
#                     status_code=status.HTTP_409_CONFLICT,
#                     content={"message": "Peer already exists"}
#                 )
#             else:
#                 return JSONResponse(
#                     status_code=status.HTTP_200_OK,
#                     content={"message": "Peer is available"}
#                 )
#         except IntegrityError as e:
#             await session.rollback()
#             raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")
#         except SQLAlchemyError as e:
#             await session.rollback()
#             raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
#         except Exception as e:
#             await session.rollback()
#             raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")
#         finally:
#             await session.close()
#             await async_engine.dispose()

async def validate(columnname: str, columnvalue: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
################################################### Main Code Block ###################################################
        if columnname == "p_peerName":
            conditions = [
                Peers.p_peerName == columnvalue
            ]
            query = select(Peers).where(and_(*conditions))
        result = (await session.execute(query)).scalars().first()
        return result if result else None
################################################### Main Code Block ###################################################
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def create(peername: str, peersecret: str, peerhost: str, peerport: str, peerprefix: str, peerpilotno: str, peeroutboundprefix: str, peerinboundprefix: str, proxyid: str, proxyname: str, proxyipaddress: str, proxydirectoryname: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
####################################################### Main Code Block #######################################################
        Peer = Peers()
        Peer.p_peerName = peername
        Peer.p_peerSecret = peersecret
        Peer.p_peerHost = peerhost
        Peer.p_peerPort = peerport
        Peer.p_peerPrefix = peerprefix
        Peer.p_peerPilotno = peerpilotno
        Peer.p_peerOutboundPrefix = peeroutboundprefix
        Peer.p_peerInboundPrefix = peerinboundprefix
        Peer.p_proxyId = proxyid
        Peer.p_proxyName = proxyname
        Peer.p_peerType = 'Pulse'
        session.add(Peer)
        await session.commit()
        await session.close()
        asyncio.create_task(peer_service.createXML(peername, peersecret, peerhost, peerport, proxydirectoryname))
        asyncio.create_task(peer_service.createCONF(peername, peersecret, peerhost, peerport, peerpilotno, proxyipaddress))
####################################################### Main Code Block #######################################################
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")
    finally:
        await async_engine.dispose()

# async def update(m_accountId: int, m_accountNo: str, accountEncryption: str, m_memberExtensionNo: str, p_peerId: int, p_peerName: int, p_peerSecret: str, p_peerHost: str, p_peerPrefix: str, p_peerPort: str, p_peerType:str, p_peerStatus: str, p_peerPilotno: str, p_peerOutboundPrefix: str, p_peerInboundPrefix: str, redis_key: str):
#     # redis_client = get_redis_client_by_db(db=m_accountId)
#     # await redis_client.delete(redis_key)
#     async_engine = get_async_engine(accountEncryption)
#     async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
#     session = async_session_maker()
#     try:
#         result = await session.execute(select(Peers).where(and_(Peers.p_peerId == p_peerId)))
#         peerres = result.scalar_one_or_none()

#         if not peerres:
#             raise HTTPException(status_code=404, detail=f"Peer with ID {p_peerId} not found")
#         if p_peerType == "international":
#             folder = "proxy2"
#         else:
#             folder = "proxy1"
#         asyncio.create_task(peer_service.updateXML(peerres.p_peerName, p_peerName, p_peerSecret, p_peerHost,p_peerPort,folder))
#         peerres.p_peerName = p_peerName
#         peerres.p_peerSecret = p_peerSecret
#         peerres.p_peerHost = p_peerHost
#         peerres.p_peerPrefix = p_peerPrefix
#         peerres.p_peerPort = p_peerPort
#         peerres.p_peerType = p_peerType
#         peerres.p_peerStatus = p_peerStatus
#         peerres.p_peerPilotno = p_peerPilotno
#         peerres.p_peerOutboundPrefix = p_peerOutboundPrefix
#         peerres.p_peerInboundPrefix = p_peerInboundPrefix
#         await session.commit()
#         return JSONResponse(
#             status_code=status.HTTP_200_OK,
#             content={"message": "Peer Updated Successfully"}
#         )
#     except IntegrityError as e:
#         await session.rollback()
#         raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")
#     except SQLAlchemyError as e:
#         await session.rollback()
#         raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
#     except Exception as e:
#         await session.rollback()
#         raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")
#     finally:
#         await async_engine.dispose()

async def delete(peerid: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
####################################################### Main Code Block #######################################################
        result = (await session.execute(
            select(Peers, ProxyInstances.p_proxyDirectoryName)
            .join(ProxyInstances, Peers.p_proxyId == ProxyInstances.p_proxyId, isouter=True) .where(Peers.p_peerId == peerid)
        )).first()
        peer, proxydirectoryname = result
        asyncio.create_task(peer_service.deleteXML(peer.p_peerName, proxydirectoryname))
        asyncio.create_task(peer_service.deleteCONF(peer.p_peerName, peer.p_peerHost))
        await session.delete(peer)
        await session.commit()
####################################################### Main Code Block #######################################################
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def fetch(limit: int, offset: int, sortField: str, sortOrder: str, searchString: any, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
####################################################### Main Code Block #######################################################
        recordQuery = select(Peers).where(Peers.p_peerType == 'Pulse')
        if searchString:
            recordQuery = recordQuery.where(
                or_(
                    Peers.p_peerName.ilike(f"%{searchString}%"),
                    Peers.p_peerHost.ilike(f"%{searchString}%"),
                    Peers.p_peerPort.ilike(f"%{searchString}%"),
                    Peers.p_peerPilotno.ilike(f"%{searchString}%")
                )
            )
        if sortField and sortOrder:
            recordQuery = recordQuery.order_by(getattr(getattr(Peers, sortField), sortOrder.lower())())
        totalRecordsCountQuery = select(func.count()).select_from(recordQuery.subquery())
        totalRecordsCount = (await session.execute(totalRecordsCountQuery)).scalar()
        totalRecordsUnserialized = (await session.execute(recordQuery.offset(offset).limit(limit))).scalars().all()
        return {
            "totalRecordsCount": totalRecordsCount,
            "totalRecords": totalRecordsUnserialized
        }
####################################################### Main Code Block #######################################################
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()
            
# async def dropdown(m_accountId: str, m_accountNo:str, accountEncryption: str, m_memberExtensionNo: str) -> dict:
    
#     async_engine = get_async_engine(accountEncryption)
#     async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
#     session = async_session_maker()
#     try:
#         base_query =  select(Peers).where(Peers.p_peerStatus == 'Active')

#         result = await session.execute(base_query)
#         allpeers = result.scalars().all()
        
#         # Serialize
#         allpeers_serializable = [
#             Peerlistdropdown.from_orm(peer).model_dump(mode="json") for peer in allpeers
#         ]
        
#         response_payload = {
#             "data": allpeers_serializable
#         }
        
#         return response_payload
#     except IntegrityError as e:
#         await session.rollback()
#         raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")

#     except SQLAlchemyError as e:
#         await session.rollback()
#         raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

#     except Exception as e:
#         await session.rollback()
#         raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

#     finally:
#         await async_engine.dispose()

async def WhatsappPeerCreate(peername: str, peersecret: str, peerhost: str, peerport: str, proxyid: str, proxyname: str, proxyipaddress: str, proxydirectoryname: str, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
####################################################### Main Code Block #######################################################
        Peer = Peers()
        Peer.p_peerName = peername
        Peer.p_peerSecret = peersecret
        Peer.p_peerHost = peerhost
        Peer.p_peerPort = peerport
        Peer.p_proxyId = proxyid
        Peer.p_proxyName = proxyname
        Peer.p_peerType = 'Whatsapp'
        session.add(Peer)
        await session.commit()
        await session.close()
        asyncio.create_task(peer_service.createXML(peername, peersecret, peerhost, peerport, proxydirectoryname))
####################################################### Main Code Block #######################################################
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error: {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")
    finally:
        await async_engine.dispose()

async def WhatsappPeerDelete(peerid: int, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
####################################################### Main Code Block #######################################################
        result = (await session.execute(
            select(Peers, ProxyInstances.p_proxyDirectoryName)
            .join(ProxyInstances, Peers.p_proxyId == ProxyInstances.p_proxyId, isouter=True) .where(Peers.p_peerId == peerid)
        )).first()
        peer, proxydirectoryname = result
        asyncio.create_task(peer_service.deleteXML(peer.p_peerName, proxydirectoryname))
        await session.delete(peer)
        await session.commit()
####################################################### Main Code Block #######################################################
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()

async def WhatsappPeerFetch(limit: int, offset: int, sortField: str, sortOrder: str, searchString: any, database: str):
    async_engine = get_async_engine(database)
    async_session_maker = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    session = async_session_maker()
    try:
####################################################### Main Code Block #######################################################
        recordQuery = select(Peers).where(Peers.p_peerType == 'Whatsapp')
        if searchString:
            recordQuery = recordQuery.where(
                or_(
                    Peers.p_peerName.ilike(f"%{searchString}%"),
                    Peers.p_peerHost.ilike(f"%{searchString}%"),
                    Peers.p_peerPort.ilike(f"%{searchString}%"),
                    Peers.p_peerPilotno.ilike(f"%{searchString}%")
                )
            )
        if sortField and sortOrder:
            recordQuery = recordQuery.order_by(getattr(getattr(Peers, sortField), sortOrder.lower())())
        totalRecordsCountQuery = select(func.count()).select_from(recordQuery.subquery())
        totalRecordsCount = (await session.execute(totalRecordsCountQuery)).scalar()
        totalRecordsUnserialized = (await session.execute(recordQuery.offset(offset).limit(limit))).scalars().all()
        return {
            "totalRecordsCount": totalRecordsCount,
            "totalRecords": totalRecordsUnserialized
        }
####################################################### Main Code Block #######################################################
    except IntegrityError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=f"Integrity Error, {str(e.orig)}")
    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error, {str(e)}")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected Error, {str(e)}")
    finally:
        await session.close()
        await async_engine.dispose()