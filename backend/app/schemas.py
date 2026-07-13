from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class UserResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        serialize_by_alias=True,
    )

    id: int
    email: str
    daily_focus_goal_minutes: int = Field(alias="dailyFocusGoalMinutes")


class UserGoalUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    daily_focus_goal_minutes: int = Field(
        alias="dailyFocusGoalMinutes",
        ge=15,
        le=1440,
    )


class TokenResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    access_token: str = Field(alias="accessToken")
    token_type: str = Field(alias="tokenType")


class FocusSessionCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(min_length=1)
    date: date
    start_time: datetime = Field(alias="startTime")
    end_time: datetime = Field(alias="endTime")
    duration_seconds: int = Field(alias="durationSeconds", ge=0)
    duration_minutes: float = Field(alias="durationMinutes", ge=0)

    @model_validator(mode="after")
    def validate_session_times(self):
        if self.end_time < self.start_time:
            raise ValueError("endTime must not be before startTime")
        return self


class FocusSessionResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        serialize_by_alias=True,
    )

    id: str
    date: date
    start_time: datetime = Field(alias="startTime")
    end_time: datetime = Field(alias="endTime")
    duration_seconds: int = Field(alias="durationSeconds")
    duration_minutes: float = Field(alias="durationMinutes")
