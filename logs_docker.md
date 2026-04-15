root@srv1476455:/opt/outcallsAI# docker logs recovia-backend --tail 100 | grep -E "SCHEDULE|scheduler|campaign|CALL|caller|ERROR|error"
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "/usr/local/lib/python3.12/site-packages/uvicorn/protocols/http/httptools_impl.py", line 420, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/uvicorn/middleware/proxy_headers.py", line 60, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/fastapi/applications.py", line 1163, in __call__
    await super().__call__(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/applications.py", line 90, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/errors.py", line 186, in __call__
    raise exc
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/errors.py", line 164, in __call__
    await self.app(scope, receive, _send)
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/cors.py", line 88, in __call__
    await self.app(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 191, in __call__
    with recv_stream, send_stream, collapse_excgroups():
                                   ^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/contextlib.py", line 158, in __exit__
    self.gen.throw(value)
  File "/usr/local/lib/python3.12/site-packages/starlette/_utils.py", line 87, in collapse_excgroups
    raise exc
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 193, in __call__
    response = await self.dispatch_func(request, call_next)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/slowapi/middleware.py", line 136, in dispatch
    response = await call_next(request)
               ^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 168, in call_next
    raise app_exc from app_exc.__cause__ or app_exc.__context__
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 144, in coro
    await self.app(scope, receive_or_disconnect, send_no_error)
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/exceptions.py", line 63, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "/usr/local/lib/python3.12/site-packages/fastapi/middleware/asyncexitstack.py", line 18, in __call__
    await self.app(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 660, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 680, in app
    await route.handle(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 276, in handle
    await self.app(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 134, in app
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 120, in app
    response = await f(request)
               ^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 674, in app
    raw_response = await run_endpoint_function(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 328, in run_endpoint_function
    return await dependant.call(**values)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/app/app/routers/messaging.py", line 145, in get_message_history
    result = db.table("tenant_messages").select("*").eq("tenant_id", tenant_id).order("created_at", desc=True).execute()
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/postgrest/_sync/request_builder.py", line 53, in execute
    raise APIError(dict(json_obj))
postgrest.exceptions.APIError: {'message': "Could not find the table 'public.tenant_messages' in the schema cache", 'code': 'PGRST205', 'hint': "Perhaps you meant the table 'public.tenants'", 'details': None}
INFO:     127.0.0.1:42364 - "GET /api/campaigns HTTP/1.1" 200 OK
INFO:     127.0.0.1:42366 - "GET /api/campaigns/activity HTTP/1.1" 200 OK
INFO:     127.0.0.1:59598 - "GET /api/campaigns/e3405bba-3cc7-433b-8800-9ba3643c12b0 HTTP/1.1" 200 OK
INFO:     127.0.0.1:59602 - "GET /api/tenants/campaign/e3405bba-3cc7-433b-8800-9ba3643c12b0 HTTP/1.1" 200 OK
INFO:     127.0.0.1:59608 - "GET /api/campaigns/e3405bba-3cc7-433b-8800-9ba3643c12b0/stats HTTP/1.1" 200 OK
INFO:     127.0.0.1:44292 - "GET /api/campaigns HTTP/1.1" 200 OK
INFO:     127.0.0.1:44302 - "GET /api/campaigns/activity HTTP/1.1" 200 OK
INFO:     127.0.0.1:54690 - "POST /api/campaigns HTTP/1.1" 200 OK
INFO:     127.0.0.1:54696 - "GET /api/campaigns/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
INFO:     127.0.0.1:54710 - "GET /api/tenants/campaign/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
INFO:     127.0.0.1:36148 - "POST /api/tenants/campaign/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
INFO:     127.0.0.1:36154 - "GET /api/tenants/campaign/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
INFO:     127.0.0.1:36158 - "GET /api/campaigns/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
2026-04-15 17:28:52,255 INFO [app.routers.campaigns] [SCHEDULE] campaign_id=e7a75469-b060-4b4c-80ba-fbdbb8f9416b scheduled_at=2026-04-15T17:30:00.000Z agency=b98fbd4e-131d-476c-86de-134b8e3e6d59
2026-04-15 17:28:52,319 INFO [app.routers.campaigns] [SCHEDULE] current status=draft
2026-04-15 17:28:52,354 INFO [app.routers.campaigns] [SCHEDULE] update result: [{'id': 'e7a75469-b060-4b4c-80ba-fbdbb8f9416b', 'agency_id': 'b98fbd4e-131d-476c-86de-134b8e3e6d59', 'name': 'Relance Test', 'status': 'scheduled', 'call_window_start': '09:00:00', 'call_window_end': '18:00:00', 'call_days': ['mon', 'tue', 'wed', 'thu', 'fri'], 'max_concurrent_calls': 5, 'max_attempts': 3, 'created_at': '2026-04-15T17:28:03.400973+00:00', 'updated_at': '2026-04-15T17:28:03.400973+00:00', 'scheduled_at': '2026-04-15T17:30:00+00:00'}]
INFO:     127.0.0.1:45574 - "POST /api/campaigns/e7a75469-b060-4b4c-80ba-fbdbb8f9416b/schedule HTTP/1.1" 200 OK
INFO:     127.0.0.1:45580 - "GET /api/campaigns/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
INFO:     127.0.0.1:45586 - "GET /api/tenants/campaign/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
2026-04-15 17:30:18,543 INFO [scheduler] Scheduler: launching campaign e7a75469-b060-4b4c-80ba-fbdbb8f9416b
2026-04-15 17:30:18,739 INFO [app.services.campaign_runner] Campaign e7a75469-b060-4b4c-80ba-fbdbb8f9416b: outside call window, pausing
INFO:     127.0.0.1:57294 - "GET /api/campaigns/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
INFO:     127.0.0.1:57300 - "GET /api/tenants/campaign/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
INFO:     127.0.0.1:57310 - "GET /api/campaigns/e7a75469-b060-4b4c-80ba-fbdbb8f9416b/stats HTTP/1.1" 200 OK
root@srv1476455:/opt/outcallsAI# docker logs recovia-backend --since 5m
INFO:     127.0.0.1:57294 - "GET /api/campaigns/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
INFO:     127.0.0.1:57300 - "GET /api/tenants/campaign/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
INFO:     127.0.0.1:57310 - "GET /api/campaigns/e7a75469-b060-4b4c-80ba-fbdbb8f9416b/stats HTTP/1.1" 200 OK
root@srv1476455:/opt/outcallsAI# 

root@srv1476455:/opt/outcallsAI# docker logs recovia-backend --tail 100 | grep -E "SCHEDULE|scheduler|campaign|CALL|caller|ERROR|error"
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "/usr/local/lib/python3.12/site-packages/uvicorn/protocols/http/httptools_impl.py", line 420, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/uvicorn/middleware/proxy_headers.py", line 60, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/fastapi/applications.py", line 1163, in __call__
    await super().__call__(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/applications.py", line 90, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/errors.py", line 186, in __call__
    raise exc
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/errors.py", line 164, in __call__
    await self.app(scope, receive, _send)
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/cors.py", line 88, in __call__
    await self.app(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 191, in __call__
    with recv_stream, send_stream, collapse_excgroups():
                                   ^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/contextlib.py", line 158, in __exit__
    self.gen.throw(value)
  File "/usr/local/lib/python3.12/site-packages/starlette/_utils.py", line 87, in collapse_excgroups
    raise exc
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 193, in __call__
    response = await self.dispatch_func(request, call_next)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/slowapi/middleware.py", line 136, in dispatch
    response = await call_next(request)
               ^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 168, in call_next
    raise app_exc from app_exc.__cause__ or app_exc.__context__
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/base.py", line 144, in coro
    await self.app(scope, receive_or_disconnect, send_no_error)
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/exceptions.py", line 63, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "/usr/local/lib/python3.12/site-packages/fastapi/middleware/asyncexitstack.py", line 18, in __call__
    await self.app(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 660, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 680, in app
    await route.handle(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 276, in handle
    await self.app(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 134, in app
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 120, in app
    response = await f(request)
               ^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 674, in app
    raw_response = await run_endpoint_function(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 328, in run_endpoint_function
    return await dependant.call(**values)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/app/app/routers/messaging.py", line 145, in get_message_history
    result = db.table("tenant_messages").select("*").eq("tenant_id", tenant_id).order("created_at", desc=True).execute()
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/postgrest/_sync/request_builder.py", line 53, in execute
    raise APIError(dict(json_obj))
postgrest.exceptions.APIError: {'message': "Could not find the table 'public.tenant_messages' in the schema cache", 'code': 'PGRST205', 'hint': "Perhaps you meant the table 'public.tenants'", 'details': None}
INFO:     127.0.0.1:42364 - "GET /api/campaigns HTTP/1.1" 200 OK
INFO:     127.0.0.1:42366 - "GET /api/campaigns/activity HTTP/1.1" 200 OK
INFO:     127.0.0.1:59598 - "GET /api/campaigns/e3405bba-3cc7-433b-8800-9ba3643c12b0 HTTP/1.1" 200 OK
INFO:     127.0.0.1:59602 - "GET /api/tenants/campaign/e3405bba-3cc7-433b-8800-9ba3643c12b0 HTTP/1.1" 200 OK
INFO:     127.0.0.1:59608 - "GET /api/campaigns/e3405bba-3cc7-433b-8800-9ba3643c12b0/stats HTTP/1.1" 200 OK
INFO:     127.0.0.1:44292 - "GET /api/campaigns HTTP/1.1" 200 OK
INFO:     127.0.0.1:44302 - "GET /api/campaigns/activity HTTP/1.1" 200 OK
INFO:     127.0.0.1:54690 - "POST /api/campaigns HTTP/1.1" 200 OK
INFO:     127.0.0.1:54696 - "GET /api/campaigns/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
INFO:     127.0.0.1:54710 - "GET /api/tenants/campaign/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
INFO:     127.0.0.1:36148 - "POST /api/tenants/campaign/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
INFO:     127.0.0.1:36154 - "GET /api/tenants/campaign/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
INFO:     127.0.0.1:36158 - "GET /api/campaigns/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
2026-04-15 17:28:52,255 INFO [app.routers.campaigns] [SCHEDULE] campaign_id=e7a75469-b060-4b4c-80ba-fbdbb8f9416b scheduled_at=2026-04-15T17:30:00.000Z agency=b98fbd4e-131d-476c-86de-134b8e3e6d59
2026-04-15 17:28:52,319 INFO [app.routers.campaigns] [SCHEDULE] current status=draft
2026-04-15 17:28:52,354 INFO [app.routers.campaigns] [SCHEDULE] update result: [{'id': 'e7a75469-b060-4b4c-80ba-fbdbb8f9416b', 'agency_id': 'b98fbd4e-131d-476c-86de-134b8e3e6d59', 'name': 'Relance Test', 'status': 'scheduled', 'call_window_start': '09:00:00', 'call_window_end': '18:00:00', 'call_days': ['mon', 'tue', 'wed', 'thu', 'fri'], 'max_concurrent_calls': 5, 'max_attempts': 3, 'created_at': '2026-04-15T17:28:03.400973+00:00', 'updated_at': '2026-04-15T17:28:03.400973+00:00', 'scheduled_at': '2026-04-15T17:30:00+00:00'}]
INFO:     127.0.0.1:45574 - "POST /api/campaigns/e7a75469-b060-4b4c-80ba-fbdbb8f9416b/schedule HTTP/1.1" 200 OK
INFO:     127.0.0.1:45580 - "GET /api/campaigns/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
INFO:     127.0.0.1:45586 - "GET /api/tenants/campaign/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
2026-04-15 17:30:18,543 INFO [scheduler] Scheduler: launching campaign e7a75469-b060-4b4c-80ba-fbdbb8f9416b
2026-04-15 17:30:18,739 INFO [app.services.campaign_runner] Campaign e7a75469-b060-4b4c-80ba-fbdbb8f9416b: outside call window, pausing
INFO:     127.0.0.1:57294 - "GET /api/campaigns/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
INFO:     127.0.0.1:57300 - "GET /api/tenants/campaign/e7a75469-b060-4b4c-80ba-fbdbb8f9416b HTTP/1.1" 200 OK
INFO:     127.0.0.1:57310 - "GET /api/campaigns/e7a75469-b060-4b4c-80ba-fbdbb8f9416b/stats HTTP/1.1" 200 OK
root@srv1476455:/opt/outcallsAI# 