const API_BASE =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000/api`
    : "http://localhost:8000/api";

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

export async function getTenants(campaignId: string) {
  return fetchAPI(`/tenants/campaign/${campaignId}`);
}

export async function getTenantCalls(tenantId: string) {
  return fetchAPI(`/tenants/${tenantId}/calls`);
}
