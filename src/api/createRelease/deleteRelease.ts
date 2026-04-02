
export async function deleteReleaseById(id: string) {
  console.log('API: deleteReleaseById (Mocked for Demo)', id);
  return { status: 'success', message: 'Release deleted successfully (Mocked)', statusCode: 200 };
}

export const deleteRelease = deleteReleaseById;