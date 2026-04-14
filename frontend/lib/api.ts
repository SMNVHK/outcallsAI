const API_BASE = "/api";

async function fetchAPI(path: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    throw new Error("Non autorisé");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur serveur" }));
    throw new Error(err.detail || "Erreur");
  }

  return res.json();
}

export async function login(email: string, password: string) {
  const data = await fetchAPI("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("token", data.access_token);
  localStorage.setItem("agency_id", data.agency_id);
  localStorage.setItem("agency_name", data.agency_name);
  return data;
}

export async function register(
  name: string,
  email: string,
  password: string,
  phone?: string,
  caller_id?: string,
) {
  const data = await fetchAPI("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, phone, caller_id }),
  });
  localStorage.setItem("token", data.access_token);
  localStorage.setItem("agency_id", data.agency_id);
  localStorage.setItem("agency_name", data.agency_name);
  return data;
}

export async function getCampaigns() {
  return fetchAPI("/campaigns");
}

export async function getRecentActivity() {
  return fetchAPI("/campaigns/activity");
}

export async function getCampaignReport(id: string) {
  return fetchAPI(`/campaigns/${id}/report`);
}

export async function getCampaign(id: string) {
  return fetchAPI(`/campaigns/${id}`);
}

export async function createCampaign(name: string) {
  return fetchAPI("/campaigns", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function uploadCSV(campaignId: string, file: File) {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/campaigns/${campaignId}/upload-csv`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur upload" }));
    throw new Error(err.detail || "Erreur upload CSV");
  }

  return res.json();
}

export async function startCampaign(id: string) {
  return fetchAPI(`/campaigns/${id}/start`, { method: "POST" });
}

export async function pauseCampaign(id: string) {
  return fetchAPI(`/campaigns/${id}/pause`, { method: "POST" });
}

export async function resetCampaign(id: string) {
  return fetchAPI(`/campaigns/${id}/reset`, { method: "POST" });
}

export async function deleteCampaign(id: string) {
  return fetchAPI(`/campaigns/${id}`, { method: "DELETE" });
}

export async function getTenants(campaignId: string) {
  return fetchAPI(`/tenants/campaign/${campaignId}`);
}

export async function addTenant(
  campaignId: string,
  data: {
    name: string;
    phone: string;
    property_address: string;
    amount_due: number;
    due_date: string;
  },
) {
  return fetchAPI(`/tenants/campaign/${campaignId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteTenant(tenantId: string) {
  return fetchAPI(`/tenants/${tenantId}`, { method: "DELETE" });
}

export async function getTenantCalls(tenantId: string) {
  return fetchAPI(`/tenants/${tenantId}/calls`);
}

// ─── Messaging ─────────────────────────────────────────────────

export async function sendSMS(tenantId: string, message: string) {
  return fetchAPI("/messaging/sms/send", {
    method: "POST",
    body: JSON.stringify({ tenant_id: tenantId, message }),
  });
}

export async function sendBulkSMS(
  campaignId: string,
  message: string,
  statusFilter?: string,
) {
  return fetchAPI("/messaging/sms/bulk", {
    method: "POST",
    body: JSON.stringify({
      campaign_id: campaignId,
      message,
      status_filter: statusFilter || null,
    }),
  });
}

export async function sendEmail(tenantId: string, tenantEmail?: string) {
  return fetchAPI("/messaging/email/send", {
    method: "POST",
    body: JSON.stringify({ tenant_id: tenantId, tenant_email: tenantEmail }),
  });
}

export async function getMessageHistory(tenantId: string) {
  return fetchAPI(`/messaging/history/${tenantId}`);
}

// ─── Profile ───────────────────────────────────────────────────

export async function getProfile() {
  return fetchAPI("/auth/profile");
}

export async function updateProfile(data: {
  name?: string;
  phone?: string;
  caller_id?: string;
}) {
  return fetchAPI("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
