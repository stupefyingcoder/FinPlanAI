"""Financial goals — the table the Goals tab and the Goal agent both need."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import FinancialGoal, UserAccount
from app.schemas import GoalCreate, GoalResponse, GoalUpdate

router = APIRouter(prefix="/api/goals", tags=["goals"])


def _to_response(goal: FinancialGoal) -> GoalResponse:
    target = float(goal.target_amount or 0)
    current = float(goal.current_amount or 0)
    return GoalResponse(
        goal_id=goal.goal_id,
        goal_name=goal.goal_name,
        target_amount=target,
        current_amount=current,
        target_date=goal.target_date,
        priority=goal.priority,
        status=goal.status,
        progress_pct=round(min(100.0, 100.0 * current / target), 2) if target else 0.0,
    )


def _owned_goal(goal_id: int, user: UserAccount, db: Session) -> FinancialGoal:
    goal = db.get(FinancialGoal, goal_id)
    # 404 rather than 403 for another user's goal, so the API does not confirm it exists.
    if goal is None or goal.user_id != user.user_id:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.get("", response_model=list[GoalResponse])
def list_goals(user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)):
    goals = db.scalars(
        select(FinancialGoal)
        .where(FinancialGoal.user_id == user.user_id)
        .order_by(FinancialGoal.created_at.desc())
    ).all()
    return [_to_response(g) for g in goals]


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalCreate,
    user: UserAccount = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = FinancialGoal(user_id=user.user_id, **payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _to_response(goal)


@router.patch("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    payload: GoalUpdate,
    user: UserAccount = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = _owned_goal(goal_id, user, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(goal, key, value)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _to_response(goal)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: int,
    user: UserAccount = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.delete(_owned_goal(goal_id, user, db))
    db.commit()
