import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api`, timeout: 70000 });

export const getStatus = () => api.get("/status").then((r) => r.data);
export const getCatalog = () => api.get("/intelligence/catalog").then((r) => r.data);

export const getEntity = (slug) =>
  api.get(`/intelligence/entity/${slug}`).then((r) => r.data);
export const getEntityBalances = (slug) =>
  api.get(`/intelligence/entity/${slug}/balances`).then((r) => r.data);
export const getCounterparties = (slug, timeLast = "30d") =>
  api
    .get(`/intelligence/entity/${slug}/counterparties`, { params: { timeLast } })
    .then((r) => r.data);

export const getAddress = (addr) =>
  api.get(`/intelligence/address/${addr}`).then((r) => r.data);
export const getAddressBalances = (addr) =>
  api.get(`/intelligence/address/${addr}/balances`).then((r) => r.data);

export const resolveSearch = (query) =>
  api.get("/intelligence/search", { params: { query } }).then((r) => r.data);

export const getTransfers = (params) =>
  api.get("/transactions/transfers", { params }).then((r) => r.data);
export const getSwaps = (params) =>
  api.get("/transactions/swaps", { params }).then((r) => r.data);

export const getTrending = () => api.get("/tokens/trending").then((r) => r.data);
export const getHolders = (slug) =>
  api.get(`/tokens/holders/${slug}`).then((r) => r.data);
export const getFlow = (slug, timeLast = "24h") =>
  api.get(`/tokens/flow/${slug}`, { params: { timeLast } }).then((r) => r.data);

export const generateContent = (body) =>
  api.post("/content/generate", body).then((r) => r.data);

export const errMsg = (e) =>
  e?.response?.data?.detail || e?.message || "Request failed";

export default api;
