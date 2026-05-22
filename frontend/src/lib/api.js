import axios from "axios";

const RAW_BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const BACKEND_URL = RAW_BACKEND.replace(/\/api\/?$/, "");
export const API = `${BACKEND_URL}/api`;
export const fetchState    = () => axios.get(`${API}/sim/state`).then(r => r.data);
export const fetchMetrics  = () => axios.get(`${API}/sim/metrics`).then(r => r.data);
export const requestInsights = (horizon = 25) =>
  axios.post(`${API}/sim/insights`, { horizon }).then(r => r.data);
export const resetSim = () => axios.post(`${API}/sim/reset`).then(r => r.data);
