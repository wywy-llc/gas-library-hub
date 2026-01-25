import { redirect } from '@sveltejs/kit';
import { GetContributionDashboardService } from '$lib/server/services/get-contribution-dashboard-service.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/auth/register?redirect=/user/dashboard');
  }

  const dashboard = await GetContributionDashboardService.call(locals.user.id);

  return {
    dashboard,
  };
};
