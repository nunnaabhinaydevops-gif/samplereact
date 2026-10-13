import { useState } from 'react'
import AppShell from './components/AppShell'
import StatusScreen from './components/StatusScreen'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import ModulePlaceholder from './pages/ModulePlaceholder'
import { getVisibleModules } from './lib/roles'

function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

function Gate() {
  const { authReady, firebaseUser, profile, profileStatus, profileError, signOut } = useAuth()
  const [activeKey, setActiveKey] = useState('dashboard')

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

  const modules = getVisibleModules(profile.role)
  if (modules.length === 0) {
    return (
      <StatusScreen
        title="Role not recognized"
        message="Your account has an unknown role. Contact HR to correct it."
        onSignOut={signOut}
      />
    )
  }

  const activeModule = modules.find((module) => module.key === activeKey) ?? modules[0]

  return (
    <AppShell modules={modules} activeKey={activeModule.key} onSelect={setActiveKey}>
      {activeModule.key === 'dashboard' ? (
        <DashboardPage />
      ) : (
        <ModulePlaceholder module={activeModule} />
      )}
    </AppShell>
  )
}

export default App
