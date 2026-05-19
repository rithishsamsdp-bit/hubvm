import socketio
mgr = socketio.AsyncRedisManager(
    'redis://testnew.ks3tw6.clustercfg.aps1.cache.amazonaws.com:6379'
)
sio = socketio.AsyncServer(async_mode='asgi',cors_allowed_origins="*",logger=True,engineio_logger=True,client_manager=mgr)