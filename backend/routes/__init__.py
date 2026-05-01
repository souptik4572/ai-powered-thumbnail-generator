from fastapi import APIRouter

from routes.job_route import router as job_router
from routes.thumbnail_route import router as thumbnail_router
from routes.user_route import router as user_router

router = APIRouter(prefix="/api")


router.include_router(job_router)
router.include_router(thumbnail_router)
router.include_router(user_router)

# importing the modules is sufficient because they register routes on `router`
