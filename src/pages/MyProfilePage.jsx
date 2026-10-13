import EmployeeDetails from '../components/EmployeeDetails'
import { EmptyState, ErrorState, LoadingState } from '../components/ui'
import { useOwnEmployee } from '../hooks/useOwnEmployee'

export default function MyProfilePage() {
  const own = useOwnEmployee()

  if (own.status === 'loading') return <LoadingState label="Loading your profile…" />
  if (own.status === 'unlinked') {
    return (
      <EmptyState
        title="No employee profile linked"
        message="Ask HR to link your sign-in to your employee record."
      />
    )
  }
  if (own.status === 'missing') {
    return <EmptyState title="Profile not found" message="Your linked employee record does not exist. Contact HR." />
  }
  if (own.status === 'error') return <ErrorState message={own.error} />
  return <EmployeeDetails employee={own.employee} canManage={false} />
}
