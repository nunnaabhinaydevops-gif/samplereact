import { useState } from 'react'
import AppShell from './components/AppShell'
import StatusScreen from './components/StatusScreen'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import { useEmployees } from './hooks/useEmployees'
import DashboardPage from './pages/DashboardPage'
import EmployeesPage from './pages/EmployeesPage'
import LoginPage from './pages/LoginPage'
import ModulePlaceholder from './pages/ModulePlaceholder'
import MyProfilePage from './pages/MyProfilePage'
import { fullName } from './lib/format'
import { getVisibleModules } from './lib/roles'

function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

function Gate() {
  const { authReady, firebaseUser, profileStatus, profileError, signOut } = useAuth()

  if (!authReady) {
    return <StatusScreen title="Loading…" />
  }

  if (!firebaseUser) {
    return <LoginPage />
  }

  if (profileStatus === 'loading') {
    return <StatusScreen title="Loading your workspace…" />
  }

  if (profileStatus === 'missing') {
    return (
      <StatusScreen
        title="Account not set up"
        message="Your sign-in works, but HR has not activated an HRMS profile for this account yet."
        onSignOut={signOut}
      />
    )
  }

  if (profileStatus === 'inactive') {
    return (
      <StatusScreen
        title="Account deactivated"
        message="This account is inactive. Contact HR if you think this is a mistake."
        onSignOut={signOut}
      />
    )
  }

  if (profileStatus === 'error') {
    return (
      <StatusScreen
        title="Could not load your profile"
        message={profileError || 'Something went wrong. Please try again.'}
        onSignOut={signOut}
      />
    )
  }

  return <Workspace />
}

function Workspace() {
  const { profile } = useAuth()
  const modules = getVisibleModules(profile.role)
  const directory = useEmployees()
  const [route, setRoute] = useState({ key: 'dashboard', employeeId: null })

  if (modules.length === 0) {
    return (
      <StatusScreen
        title="Role not recognized"
        message="Your account has an unknown role. Contact HR to correct it."
      />
    )
  }

  const isAllowed = route.key === 'my-profile' || modules.some((module) => module.key === route.key)
  const activeRoute = isAllowed ? route : { key: 'dashboard', employeeId: null }

  function navigate(key, params = {}) {
    setRoute({ key, employeeId: params.employeeId ?? null })
  }

  const moduleLabel =
    activeRoute.key === 'my-profile'
      ? 'My profile'
      : modules.find((module) => module.key === activeRoute.key)?.label ?? ''

  const breadcrumbs = [{ label: 'Dashboard', onClick: () => navigate('dashboard') }]
  if (activeRoute.key !== 'dashboard') {
    breadcrumbs.push({
      label: moduleLabel,
      onClick: activeRoute.employeeId ? () => navigate(activeRoute.key) : undefined,
    })
  }
  if (activeRoute.employeeId) {
    const employee = directory.employees.find((item) => item.id === activeRoute.employeeId)
    breadcrumbs.push({ label: employee ? fullName(employee) : 'Employee' })
  }

  let content
  if (activeRoute.key === 'dashboard') {
    content = <DashboardPage directory={directory} onNavigate={navigate} />
  } else if (activeRoute.key === 'employees') {
    content = <EmployeesPage directory={directory} route={activeRoute} onNavigate={navigate} />
  } else if (activeRoute.key === 'my-profile') {
    content = <MyProfilePage />
  } else {
    content = <ModulePlaceholder module={modules.find((module) => module.key === activeRoute.key)} />
  }

  return (
    <AppShell
      modules={modules}
      activeKey={activeRoute.key}
      onNavigate={navigate}
      breadcrumbs={breadcrumbs}
      searchEmployees={directory.status === 'ready' ? directory.employees : []}
    >
      {content}
    </AppShell>
  )
}

export default App
