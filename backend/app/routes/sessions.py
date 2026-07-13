from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models import FocusSession, User
from ..schemas import FocusSessionCreate, FocusSessionResponse

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post(
    "",
    response_model=FocusSessionResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
)
def create_session(
    payload: FocusSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FocusSession:
    existing = db.get(FocusSession, payload.id)

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A focus session with this ID already exists.",
        )

    session = FocusSession(
        id=payload.id,
        user_id=current_user.id,
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        duration_seconds=payload.duration_seconds,
        duration_minutes=payload.duration_minutes,
    )

    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get(
    "",
    response_model=list[FocusSessionResponse],
    response_model_by_alias=True,
)
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[FocusSession]:
    statement = (
        select(FocusSession)
        .where(FocusSession.user_id == current_user.id)
        .order_by(FocusSession.start_time.asc(), FocusSession.id.asc())
    )
    return list(db.scalars(statement).all())


@router.get(
    "/date/{session_date}",
    response_model=list[FocusSessionResponse],
    response_model_by_alias=True,
)
def list_sessions_by_date(
    session_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[FocusSession]:
    statement = (
        select(FocusSession)
        .where(
            FocusSession.user_id == current_user.id,
            FocusSession.date == session_date,
        )
        .order_by(FocusSession.start_time.asc(), FocusSession.id.asc())
    )
    return list(db.scalars(statement).all())


@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    statement = select(FocusSession).where(
        FocusSession.id == session_id,
        FocusSession.user_id == current_user.id,
    )
    session = db.scalar(statement)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Focus session not found.",
        )

    db.delete(session)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
