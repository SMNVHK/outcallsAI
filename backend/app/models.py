from pydantic import BaseModel, Field
from datetime import date, time, datetime
from typing import Optional
from enum import Enum


# --- Enums ---

class TenantStatus(str, Enum):
    pending = "pending"
    will_pay = "will_pay"
    cant_pay = "cant_pay"
    no_answer = "no_answer"
    voicemail = "voicemail"
    bad_number = "bad_number"
    busy = "busy"
    refuses = "refuses"
    call_dropped = "call_dropped"
    paid = "paid"
    escalated = "escalated"


class CampaignStatus(str, Enum):
    draft = "draft"
    scheduled = "scheduled"
    running = "running"
    paused = "paused"
    completed = "completed"
    cancelled = "cancelled"


class CallStatus(str, Enum):
    initiated = "initiated"
    ringing = "ringing"
    answered = "answered"
    completed = "completed"
    no_answer = "no_answer"
    busy = "busy"
    failed = "failed"
    voicemail = "voicemail"


# --- Auth ---

class AgencyRegister(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    caller_id: Optional[str] = None


class AgencyLogin(BaseModel):
    email: str
    password: str


class AgencyProfileResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    caller_id: Optional[str] = None
    created_at: str


class AgencyProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    caller_id: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    agency_id: str
    agency_name: str


# --- Campaigns ---

class CampaignCreate(BaseModel):
    name: str
    call_window_start: time = Field(default=time(9, 0))
    call_window_end: time = Field(default=time(18, 0))
    call_days: list[str] = Field(default=["mon", "tue", "wed", "thu", "fri"])
    max_concurrent_calls: int = Field(default=5, ge=1, le=20)
    max_attempts: int = Field(default=3, ge=1, le=10)
    scheduled_at: Optional[datetime] = None


class CampaignResponse(BaseModel):
    id: str
    agency_id: str
    name: str
    status: CampaignStatus
    call_window_start: str
    call_window_end: str
    call_days: list[str]
    max_concurrent_calls: int
    max_attempts: int
    scheduled_at: Optional[str] = None
    created_at: str
    tenant_count: Optional[int] = None
    pending_count: Optional[int] = None
    completed_count: Optional[int] = None


# --- Tenants ---

class TenantCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    property_address: str
    amount_due: float
    due_date: date


class TenantResponse(BaseModel):
    id: str
    campaign_id: str
    name: str
    phone: str
    email: Optional[str] = None
    property_address: str
    amount_due: float
    due_date: str
    status: TenantStatus
    status_notes: Optional[str] = None
    promised_date: Optional[str] = None
    attempt_count: int
    last_called_at: Optional[str] = None
    next_retry_at: Optional[str] = None


class TenantCSVRow(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    property_address: str
    amount_due: float
    due_date: str


# --- Calls ---

class CallResponse(BaseModel):
    id: str
    tenant_id: str
    campaign_id: str
    status: CallStatus
    duration_seconds: Optional[int] = None
    transcript: Optional[str] = None
    summary: Optional[str] = None
    ai_status_result: Optional[str] = None
    ai_notes: Optional[str] = None
    started_at: str
    ended_at: Optional[str] = None
    error_message: Optional[str] = None


# --- Function Calling (OpenAI Realtime) ---

class UpdateTenantStatusArgs(BaseModel):
    tenant_id: str
    status: TenantStatus
    notes: str = ""
