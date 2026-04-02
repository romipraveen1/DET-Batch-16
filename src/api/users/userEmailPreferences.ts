
export async function getUserEmailPreferences(userId: string) {
  console.log('API: getUserEmailPreferences (Mocked for Demo)', userId);
  return {
    status: 'success',
    data: {
      defectCreated: true,
      defectUpdated: true,
      defectClosed: true
    }
  };
}

export async function updateUserEmailPreferences(userId: string, preferences: any) {
  console.log('API: updateUserEmailPreferences (Mocked for Demo)', { userId, preferences });
  return { status: 'success', message: 'Preferences updated successfully (Mocked)' };
}
