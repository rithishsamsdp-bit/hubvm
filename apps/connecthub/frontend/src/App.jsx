import { useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/Index.jsx";
import { useAuthStore } from "./store/useAuthStore";
import { useSocketStore } from "./store/useSocketStore";

import { Loader } from "./components/ui/loader";
import Layout from "./components/Layout";

//auth pages
import Login from "./pages/auth/Login";
import VerifyOTP from "./pages/auth/VerifyOTP";
import Error from "./pages/auth/Error";

import AccountDeletion from "./pages/auth/AccountDeletion";

// Agent pages
import Dashboard from "./pages/agent/Dashboard";
import AgentContactbook from "./pages/agent/AgentContactbook";
import Conversation from "./pages/agent/conversation/Conversation";
import AgentReports from "./pages/agent/AgentReports";
import AgentCdrReport from "./pages/agent/reports/AgentCdrReport";
import AgentCallbackReminder from "./pages/agent/reports/AgentCallbackReminder";
import AgentQueueMissedCallReport from "./pages/agent/reports/AgentQueueMissedCallReport";
import AdminCampaign from "./pages/admin/campaign/AdminCampaign.jsx";
import AdminPredictive from "./pages/admin/predictive/AdminPredictive.jsx";
import AdminConferenceReport from "./pages/admin/reports/AdminConferenceReport.jsx";

// Admin pages
import AdminReports from "./pages/admin/AdminReports";
import Integration from "./pages/admin/Integration";
import API_integration from "./pages/admin/Integration/API_integration";
import CRM_integration from "./pages/admin/Integration/CRM_integration";
import SSO_integration from "./pages/admin/Integration/SSO_integration";
import SAML_configuration from "./pages/admin/Integration/SAML_configuration";
import GoogleSAMLConfiguration from "./pages/admin/Integration/GoogleSAMLConfiguration";
import EmailAutomation from "./pages/admin/EmailAutomation";
import Admin_dashboard from "./pages/admin/Admin_dashboard";
import FormBuilder from "./formbuilder/FormBuilder";
import FormBuilder_Preview from "./formbuilder/FormBuilder_Preview";
import AdminUsers from "./pages/admin/users/AdminUsers";
import AdminUsersCreation from "./pages/admin/users/AdminUsersCreation";
import AdminCdrReport from "./pages/admin/reports/AdminCdrReport";
import AdminAiCallAudit from "./pages/admin/reports/AdminAiCallAudit";
import AdminPerformanceReport from "./pages/admin/reports/AdminPerformanceReport.jsx";
import AdminCallbackReminder from "./pages/admin/reports/AdminCallbackReminder";
import AdminAI from "./pages/admin/ai/AdminAI.jsx";
import AgentBuilderLayout from "./pages/admin/ai/agent-builder/AgentBuilderLayout.jsx";

// import FlowEditor from "./flowmap/FlowEditor";
import FlowEditor from "./callflow/FlowEditor";
import FlowEditorView from "./callflow/FlowEditorView";
import FlowEditorEdit from "./callflow/FlowEditorEdit";
import NewConversation from "./pages/agent/conversation/NewConversation";
import AdminPhoneNumber from "./pages/admin/phonenumber/AdminPhoneNumber";
import AdminEditPhoneNumber from "./pages/admin/phonenumber/AdminEditPhoneNumber";
import AdminCampaignCreate from "./pages/admin/campaign/AdminCampaignCreate.jsx";
import AdminCampaignEdit from "./pages/admin/campaign/AdminCampaignEdit.jsx";
import AdminLeadUpload from "./pages/admin/campaign/AdminLeadUpload.jsx";

import SuperAdminPhoneNumber from "./pages/superadmin/SuperAdminPhoneNumber.jsx";
import SuperAdminPeer from "./pages/superadmin/SuperAdminPeer.jsx";
import SuperAdminOnboardList from "./pages/superadmin/SuperAdminOnboardList.jsx";
import SuperAdminOnboardEdit from "./pages/superadmin/SuperAdminOnboardEdit.jsx";
import SuperAdminOnboardMembers from "./pages/superadmin/SuperAdminOnboardMembers.jsx";
import SuperAdminOnboardCreate from "./pages/superadmin/SuperAdminOnboardCreate.jsx";
import SuperAdminWhatsAppList from "./pages/superadmin/SuperAdminWhatsAppList.jsx";
import SuperAdminWhatsAppEdit from "./pages/superadmin/SuperAdminWhatsAppEdit.jsx";
import TLContactbook from "./pages/tl/TLContactbook.jsx";
import AdminLoginLogoutReport from "./pages/admin/reports/AdminLoginLogoutReport.jsx";
import AdminBreakReport from "./pages/admin/reports/AdminBreakReport.jsx";
import AdminQueueMissedCallReport from "./pages/admin/reports/AdminQueueMissedCallReport.jsx";

import AgentVoiceMail from "./pages/agent/reports/AgentVoiceMail.jsx";
import AgentMissedCallReport from "./pages/agent/reports/AgentMissedCallReport";
import AdminMissedCallReport from "./pages/admin/reports/AdminMissedCallReport";
import DLRreport from "./pages/admin/reports/DLRreport";
import SmsDLRreport from "./pages/admin/reports/SmsDLRreport";
import AdminWhatsapp from "./pages/admin/whatsapp/AdminWhatsapp.jsx";
import AdminWhatsappCreateTemplate from "./pages/admin/whatsapp/AdminWhatsappCreateTemplate.jsx";
import AdminWhatsappCreateCampaign from "./pages/admin/whatsapp/AdminWhatsappCreateCampaign.jsx";
import AdminEmergency from "./pages/admin/emergency/AdminEmergency.jsx";
import AdminEmergencyCreate from "./pages/admin/emergency/AdminEmergencyCreate.jsx";
import { useAgentSocket } from "./store/agent/useAgentSocket.js";
import AdminContactbook from "./pages/admin/AdminContactbook.jsx";
import Iframe from "./iframe/Iframe.jsx";
import SuperAdminIp from "./pages/superadmin/SuperAdminIp.jsx";
import SuperAdminReports from "./pages/superadmin/SuperAdminReports.jsx";
import SuperAdminCdrReport from "./pages/superadmin/reports/SuperAdminCdrReport.jsx";
import SuperAdminBilling from "./pages/superadmin/billing/SuperAdminBilling.jsx";
import SuperAdminApiLogs from "./pages/superadmin/SuperAdminApiLogs.jsx";
import ChatPage from "./pages/chat/ChatPage.jsx";

function App() {
  const {
    authUser,
    checkAuth,
    isCheckingAuth,
    authRole,
    authPlan,
    menus,
    authName,
    checkSessionStatus,
    sessionPollingEnabled,
  } = useAuthStore();
  const { connectSocket, disconnectSocket, socket } = useSocketStore();
  const { subscribeTodata, unsubscribeFromdata } = useAgentSocket();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authUser) {
      connectSocket();
    } else if (!authUser) {
      disconnectSocket();
    }
  }, [authUser, connectSocket, disconnectSocket]);

  useEffect(() => {
    let interval;
    if (authUser && sessionPollingEnabled) {
      checkSessionStatus();
      interval = setInterval(checkSessionStatus, 15000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [authUser, checkSessionStatus, sessionPollingEnabled]);

  useEffect(() => {
    if (authRole === "USER" && socket) {
      subscribeTodata();
    }
    return () => unsubscribeFromdata();
  }, [authRole, subscribeTodata, unsubscribeFromdata, socket]);

  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  const computeHomeRoute = () => {
    if (authRole === "USER" && authPlan?.iframe) return "/iframe";
    if (menus?.length) return menus[0].route;

    if (authRole === "SUPERADMIN") return "/superadmin-onboard";
    if (authRole === "ADMIN") {
      const order = [
        "dashboard",
        "usercreation",
        "reports",
        "phonenumber",
        "campaign",
      ];
      const map = {
        dashboard: "/admin-dashboard",
        usercreation: "/admin-usercreation",
        reports: "/admin-reports",
        phonenumber: "/admin-phonenumber",
        campaign: "/admin-campaign",
      };
      const first = order.find((k) => authPlan?.menu?.[k]);
      return first ? map[first] : "/login";
    }
    if (authRole === "TL") return "/tl-dashboard";
    if (authRole === "USER") return "/agent-dashboard";
    return "/login";
  };

  const home = computeHomeRoute();

  if (isCheckingAuth && !authUser) {
    return (
      <div className="App_loading_container">
        <Loader />
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route
            path="/"
            element={
              authUser ? (
                <Navigate to={home} replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/login"
            element={authUser ? <Navigate to={home} replace /> : <Login />}
          />
          <Route
            path="/verify-otp"
            element={authUser ? <Navigate to={home} replace /> : <VerifyOTP />}
          />
          <Route path="/account-deletion" element={<AccountDeletion />} />

          <Route
            path="/iframe"
            element={
              authUser && authRole === "USER" && authPlan?.iframe ? (
                <Iframe />
              ) : (
                <Navigate to={home} replace />
              )
            }
          />

          <Route
            path="/*"
            element={
              authUser ? (
                authRole === "USER" && authPlan?.iframe ? (
                  <Navigate to="/iframe" replace />
                ) : (
                  <Layout>
                    <Routes>
                      {authRole === "SUPERADMIN" && (
                        <>
                          <Route
                            path="/superadmin-peer"
                            element={<SuperAdminPeer />}
                          />
                          <Route
                            path="/superadmin-phonenumber"
                            element={<SuperAdminPhoneNumber />}
                          />
                          <Route
                            path="/superadmin-onboard"
                            element={<SuperAdminOnboardList />}
                          />
                          <Route
                            path="/superadmin-onboard/edit"
                            element={<SuperAdminOnboardEdit />}
                          />
                          <Route
                            path="/superadmin-onboard/members"
                            element={<SuperAdminOnboardMembers />}
                          />
                          <Route
                            path="/superadmin-onboard/ip"
                            element={<SuperAdminIp />}
                          />
                          <Route
                            path="/superadmin-whatsapp"
                            element={<SuperAdminWhatsAppList />}
                          />
                          <Route
                            path="/superadmin-whatsapp/edit"
                            element={<SuperAdminWhatsAppEdit />}
                          />
                          <Route
                            path="/superadmin-onboard-create"
                            element={<SuperAdminOnboardCreate />}
                          />
                          <Route
                            path="/superadmin-reports"
                            element={<SuperAdminReports />}
                          />
                          <Route
                            path="/superadmin-reports/superadmin-cdrReport"
                            element={<SuperAdminCdrReport />}
                          />
                          <Route
                            path="/superadmin-billing"
                            element={<SuperAdminBilling />}
                          />
                          <Route
                            path="/superadmin-apilogs"
                            element={<SuperAdminApiLogs />}
                          />
                        </>
                      )}
                      {authRole === "ADMIN" && (
                        <>
                          {/* dashboard */}
                          {authPlan.menu.dashboard && (
                            <Route
                              path="/admin-dashboard"
                              element={<Admin_dashboard />}
                            />
                          )}
                          {authPlan?.menu?.ai && (
                            <>
                              <Route path="/admin-ai" element={<AdminAI />} />
                              <Route
                                path="/admin-ai/agent-builder"
                                element={<AgentBuilderLayout />}
                              />
                            </>
                          )}
                          <Route
                            path="/admin-contactbook"
                            element={<AdminContactbook />}
                          />
                          {/* usercreation */}
                          {authPlan.menu.usercreation && (
                            <>
                              <Route
                                path="/admin-users"
                                element={<AdminUsers />}
                              />
                              <Route
                                path="/admin-users/admin-user-creation"
                                element={<AdminUsersCreation />}
                              />
                            </>
                          )}
                          {/* reports */}
                          {authPlan.menu.reports && (
                            <>
                              <Route
                                path="/admin-reports"
                                element={<AdminReports />}
                              />
                              <Route
                                path="/admin-reports/admin-cdrReport"
                                element={<AdminCdrReport />}
                              />
                              <Route
                                path="/admin-reports/admin-ai-call-audit"
                                element={<AdminAiCallAudit />}
                              />
                              <Route
                                path="/admin-reports/admin-performance"
                                element={<AdminPerformanceReport />}
                              />
                              <Route
                                path="/admin-reports/admin-login-logout"
                                element={<AdminLoginLogoutReport />}
                              />
                              <Route
                                path="/admin-reports/admin-break-report"
                                element={<AdminBreakReport />}
                              />
                              <Route
                                path="/admin-reports/admin-conference-report"
                                element={<AdminConferenceReport />}
                              />
                              <Route
                                path="/admin-reports/admin-queue-missed-calls-report"
                                element={<AdminQueueMissedCallReport />}
                              />
                              <Route
                                path="/admin-reports/admin-missed-calls-report"
                                element={<AdminMissedCallReport />}
                              />
                              <Route
                                path="/admin-reports/admin-callback-reminder"
                                element={<AdminCallbackReminder />}
                              />
                              <Route
                                path="/admin-reports/admin-whatsapp-delivery-response"
                                element={<DLRreport />}
                              />
                              <Route
                                path="/admin-reports/admin-sms-delivery-response"
                                element={<SmsDLRreport />}
                              />
                            </>
                          )}
                          {/* phonenumber */}
                          {authPlan.menu.phonenumber && (
                            <>
                              <Route
                                path="/admin-phonenumber"
                                element={<AdminPhoneNumber />}
                              />
                              <Route
                                path="/admin-edit-phonenumber"
                                element={<AdminEditPhoneNumber />}
                              />
                            </>
                          )}
                          {/* Predictive */}
                          {authPlan.menu.predictive && (
                            <Route
                              path="/admin-predictive"
                              element={<AdminPredictive />}
                            />
                          )}

                          {/* campaign */}
                          {authPlan.menu.campaign && (
                            <>
                              <Route
                                path="/admin-campaign"
                                element={<AdminCampaign />}
                              />
                              <Route
                                path="/admin-create-campaign"
                                element={<AdminCampaignCreate />}
                              />
                              <Route
                                path="/admin-edit-campaign"
                                element={<AdminCampaignEdit />}
                              />
                              <Route
                                path="/admin-campaign/admin-create-formbuilder"
                                element={<FormBuilder />}
                              />
                              <Route
                                path="/admin-campaign/admin-edit-formbuilder"
                                element={<FormBuilder />}
                              />
                              <Route
                                path="/admin-campaign/admin-preview-formbuilder"
                                element={<FormBuilder_Preview />}
                              />
                              <Route
                                path="/admin-campaign/lead-upload"
                                element={<AdminLeadUpload />}
                              />
                            </>
                          )}

                          {/* Emergency */}
                          {authPlan?.menu?.emergency && (
                            <>
                              <Route
                                path="/admin-emergency"
                                element={<AdminEmergency />}
                              />
                              <Route
                                path="/admin-emergency-create"
                                element={<AdminEmergencyCreate />}
                              />
                            </>
                          )}

                          {/* whatsapp */}

                          {authPlan?.menu?.whatsapp && (
                            <>
                              <Route
                                path="/admin-whatsapp"
                                element={<AdminWhatsapp />}
                              />
                              <Route
                                path="/admin-whatsapp/create-template"
                                element={<AdminWhatsappCreateTemplate />}
                              />
                              <Route
                                path="/admin-whatsapp/create-campaign"
                                element={<AdminWhatsappCreateCampaign />}
                              />
                            </>
                          )}

                          {/* Email Automation */}
                          {authPlan?.menu?.emailautomation && (
                            <Route
                              path="/admin-email-automation"
                              element={<EmailAutomation />}
                            />
                          )}

                          {/* Integration */}
                          {authPlan?.menu?.integration && (
                            <>
                              <Route
                                path="/admin-integration"
                                element={<Integration />}
                              />
                              <Route
                                path="/admin/integration/API_integration"
                                element={<API_integration />}
                              />
                              <Route
                                path="/admin/integration/crm"
                                element={<CRM_integration />}
                              />
                              <Route
                                path="/admin/integration/sso"
                                element={<SSO_integration />}
                              />
                              <Route
                                path="/admin/integration/sso/saml-config"
                                element={<SAML_configuration />}
                              />
                              <Route
                                path="/admin/integration/sso/google-saml-config"
                                element={<GoogleSAMLConfiguration />}
                              />
                            </>
                          )}
                        </>
                      )}
                      {authRole === "TL" && (
                        <>
                          <Route
                            path="/tl-dashboard"
                            element={<Admin_dashboard />}
                          />
                          {/* <Route path="/tl-users" element={<UserCreation />} /> */}
                          <Route
                            path="/tl-reports"
                            element={<AdminReports />}
                          />
                          <Route
                            path="/tl-reports/tl-cdrReport"
                            element={<AdminCdrReport />}
                          />
                          <Route
                            path="/tl-reports/tl-performance"
                            element={<AdminPerformanceReport />}
                          />
                          <Route
                            path="/tl-reports/tl-login-logout"
                            element={<AdminLoginLogoutReport />}
                          />
                          <Route
                            path="/tl-reports/tl-break-report"
                            element={<AdminBreakReport />}
                          />
                          <Route
                            path="/tl-reports/tl-conference-report"
                            element={<AdminConferenceReport />}
                          />
                          <Route
                            path="/tl-reports/tl-callback-reminder"
                            element={<AdminCallbackReminder />}
                          />
                          <Route
                            path="/tl-reports/tl-whatsapp-delivery-response"
                            element={<DLRreport />}
                          />
                          <Route
                            path="/tl-reports/tl-sms-delivery-response"
                            element={<SmsDLRreport />}
                          />
                          <Route
                            path="/tl-phonenumber"
                            element={<AdminPhoneNumber />}
                          />
                          <Route
                            path="/tl-campaign"
                            element={<AdminCampaign />}
                          />
                          <Route
                            path="/tl-contactbook"
                            element={<TLContactbook />}
                          />
                          <Route
                            path="/tl-conversation"
                            element={<Conversation />}
                          />
                        </>
                      )}
                      {authRole === "USER" && (
                        <>
                          <Route
                            path="/agent-dashboard"
                            element={<Dashboard />}
                          />
                          <Route
                            path="/agent-conversation"
                            element={<Conversation />}
                          />
                          <Route
                            path="/agent-new-Conversation"
                            element={<NewConversation />}
                          />
                          <Route
                            path="/agent-reports"
                            element={<AgentReports />}
                          />
                          <Route
                            path="/agent-reports/agent-cdrReport"
                            element={<AgentCdrReport />}
                          />
                          <Route
                            path="/agent-reports/agent-callback-reminder"
                            element={<AgentCallbackReminder />}
                          />
                          <Route
                            path="/agent-reports/agent-voicemail"
                            element={<AgentVoiceMail />}
                          />
                          <Route
                            path="/agent-reports/agent-queue-missed-calls-report"
                            element={<AgentQueueMissedCallReport />}
                          />
                          <Route
                            path="/agent-reports/agent-missed-calls-report"
                            element={<AgentMissedCallReport />}
                          />
                          <Route
                            path="/agent-contactbook"
                            element={<AgentContactbook />}
                          />
                          <Route path="/chat" element={<ChatPage />} />
                        </>
                      )}

                      {/* ── Team Chat — available to all authenticated roles ── */}
                      <Route path="/chat" element={<ChatPage />} />

                      <Route path="*" element={<Error />} />
                    </Routes>
                  </Layout>
                )
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/admin-flowmapping"
            element={
              authUser && authRole === "ADMIN" && authPlan.menu.phonenumber ? (
                <FlowEditor />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          <Route
            path="/superadmin-flowmapping"
            element={
              authUser && authRole === "SUPERADMIN" ? (
                <FlowEditor />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/admin-flowmapping-view"
            element={
              authUser && authRole === "ADMIN" && authPlan.menu.phonenumber ? (
                <FlowEditorView />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/tl-flowmapping-view"
            element={
              authUser && authRole === "TL" ? (
                <FlowEditorView />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/superadmin-flowmapping-view"
            element={
              authUser && authRole === "SUPERADMIN" ? (
                <FlowEditorView />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/admin-flowmapping-edit"
            element={
              authUser && authRole === "ADMIN" && authPlan.menu.phonenumber ? (
                <FlowEditorEdit />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/superadmin-flowmapping-edit"
            element={
              authUser && authRole === "SUPERADMIN" ? (
                <FlowEditorEdit />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route path="*" element={<Error />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;
