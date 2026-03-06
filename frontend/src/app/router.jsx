import React from "react";
import { createBrowserRouter } from "react-router-dom";
import App from "./App.jsx";

import AuthLayout from "./layouts/AuthLayout.jsx";
import MobileLayout from "./layouts/MobileLayout.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";

import AuthGuard from "./guards/AuthGuard.jsx";
import RoleGuard from "./guards/RoleGuard.jsx";

import LoginPage from "../features/auth/pages/LoginPage.jsx";

import DashboardPage from "../features/dashboard/pages/DashboardPage.jsx";
import AttendancePage from "../features/attendance/pages/AttendancePage.jsx";
import BreaksPage from "../features/breaks/pages/BreaksPage.jsx";
import ProfilePage from "../features/profile/pages/ProfilePage.jsx";

import AdminHomePage from "../features/admin/pages/AdminHomePage.jsx";
import UsersPage from "../features/users/pages/UsersPage.jsx";
import ManageShiftsPage from "../features/shifts/pages/ManageShiftsPage.jsx";
import WeeklyReportPage from "../features/reports/pages/WeeklyReportPage.jsx";
import PayrollPage from "../features/payroll/pages/PayrollPage.jsx";
import SettingsPage from "../features/admin/pages/SettingsPage.jsx";
import AttendanceCorrectionPage from "../features/admin/pages/AttendanceCorrectionPage.jsx";

export default createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        element: <AuthLayout />,
        children: [{ path: "/login", element: <LoginPage /> }]
      },

      {
        element: <AuthGuard />,
        children: [
          {
            element: <MobileLayout />,
            children: [
              { path: "/", element: <DashboardPage /> },
              { path: "/attendance", element: <AttendancePage /> },
              { path: "/breaks", element: <BreaksPage /> },
              { path: "/profile", element: <ProfilePage /> }
            ]
          },

          {
            element: <RoleGuard allow={["ADMIN"]} />,
            children: [
              {
                path: "/admin",
                element: <AdminLayout />,
                children: [
                  { index: true, element: <AdminHomePage /> },
                  { path: "users", element: <UsersPage /> },
                  { path: "shifts", element: <ManageShiftsPage /> },
                  { path: "reports", element: <WeeklyReportPage /> },
                  { path: "payroll", element: <PayrollPage /> },
                  { path: "settings", element: <SettingsPage /> },
                  { path: "attendance-correct", element: <AttendanceCorrectionPage /> }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
]);