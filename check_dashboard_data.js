const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase connection details
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDashboardData() {
  try {
    console.log('Checking dashboard data...\n');
    const results = {};

    // 1. Get Total Applications count (selected_plans only)
    console.log('1. Checking total applications count...');
    const { count: totalApps, error: totalAppsError } = await supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('application_type', 'selected_plans');
      
    if (!totalAppsError) {
      results.totalApplications = totalApps;
      console.log(`   Total applications: ${totalApps}`);
    } else {
      console.error('   Error getting total applications:', totalAppsError);
    }
    
    // 2. Get Approved Applications count
    console.log('\n2. Checking approved applications count...');
    const { count: approvedApps, error: approvedAppsError } = await supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('application_type', 'selected_plans')
      .eq('status', 'completed');
      
    if (!approvedAppsError) {
      results.approvedApplications = approvedApps;
      console.log(`   Approved applications: ${approvedApps}`);
    } else {
      console.error('   Error getting approved applications:', approvedAppsError);
    }
    
    // 3. Calculate Average Amount
    console.log('\n3. Calculating average amount...');
    const { data: amountsData, error: amountsError } = await supabase
      .from('applications')
      .select('amount')
      .eq('application_type', 'selected_plans')
      .not('amount', 'is', null);
      
    if (!amountsError && amountsData) {
      const amounts = amountsData
        .map(a => a.amount)
        .filter(a => a !== null && !isNaN(a) && a > 0);
        
      if (amounts.length > 0) {
        const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);
        const avgAmount = totalAmount / amounts.length;
        
        results.avgAmount = avgAmount;
        results.amounts = amounts;
        console.log(`   Average amount: $${avgAmount.toFixed(2)}`);
        console.log(`   Amounts found: ${amounts.length}`);
        console.log(`   Sample amounts: ${amounts.slice(0, 5).join(', ')}`);
      } else {
        console.log('   No valid amounts found');
      }
    } else {
      console.error('   Error getting amounts:', amountsError);
    }
    
    // 4. Get Total Clients count (unique clients with selected_plans applications)
    console.log('\n4. Counting total unique clients...');
    const { data: uniqueClientsData, error: uniqueClientsError } = await supabase
      .from('applications')
      .select('client_id')
      .eq('application_type', 'selected_plans')
      .not('client_id', 'is', null);
      
    if (!uniqueClientsError && uniqueClientsData) {
      const uniqueClientIds = [...new Set(uniqueClientsData.map(a => a.client_id))];
      results.totalClients = uniqueClientIds.length;
      console.log(`   Total unique clients: ${uniqueClientIds.length}`);
    } else {
      console.error('   Error getting unique clients:', uniqueClientsError);
    }
    
    // 5. Calculate Conversion Rate (approved / total)
    console.log('\n5. Calculating conversion rate...');
    if (results.totalApplications > 0 && results.approvedApplications !== undefined) {
      const conversionRate = (results.approvedApplications / results.totalApplications) * 100;
      results.conversionRate = conversionRate;
      console.log(`   Conversion rate: ${conversionRate.toFixed(2)}%`);
    } else {
      console.log('   Unable to calculate conversion rate');
    }
    
    // 6. Get Applications by Month
    console.log('\n6. Getting applications by month...');
    const { data: monthlyAppsData, error: monthlyAppsError } = await supabase
      .from('applications')
      .select('created_at')
      .eq('application_type', 'selected_plans')
      .order('created_at', { ascending: true });
      
    if (!monthlyAppsError && monthlyAppsData) {
      const monthlyCount = {};
      
      monthlyAppsData.forEach(app => {
        const date = new Date(app.created_at);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        monthlyCount[monthYear] = (monthlyCount[monthYear] || 0) + 1;
      });
      
      results.applicationsByMonth = Object.entries(monthlyCount).map(([month, count]) => ({
        month,
        count
      }));
      
      console.log('   Applications by month:');
      results.applicationsByMonth.forEach(item => {
        console.log(`     ${item.month}: ${item.count}`);
      });
    } else {
      console.error('   Error getting applications by month:', monthlyAppsError);
    }
    
    // 7. Get Applications by Status
    console.log('\n7. Getting applications by status...');
    const { data: statusData, error: statusError } = await supabase
      .from('applications')
      .select('status')
      .eq('application_type', 'selected_plans');
      
    if (!statusError && statusData) {
      const statusCounts = {};
      
      statusData.forEach(app => {
        const status = app.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      results.applicationsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      }));
      
      console.log('   Applications by status:');
      results.applicationsByStatus.forEach(item => {
        console.log(`     ${item.status}: ${item.count}`);
      });
    } else {
      console.error('   Error getting applications by status:', statusError);
    }
    
    // 8. Calculate Amount Ranges
    console.log('\n8. Calculating amount ranges for chart...');
    if (results.amounts && results.amounts.length > 0) {
      const ranges = [
        { range: '0-10000', count: 0 },
        { range: '10001-25000', count: 0 },
        { range: '25001-50000', count: 0 },
        { range: '50001-75000', count: 0 },
        { range: '75001-100000', count: 0 }
      ];
      
      results.amounts.forEach(amount => {
        if (amount <= 10000) ranges[0].count++;
        else if (amount <= 25000) ranges[1].count++;
        else if (amount <= 50000) ranges[2].count++;
        else if (amount <= 75000) ranges[3].count++;
        else if (amount <= 100000) ranges[4].count++;
      });
      
      results.amountRanges = ranges;
      
      console.log('   Amount ranges:');
      ranges.forEach(range => {
        console.log(`     ${range.range}: ${range.count}`);
      });
    } else {
      console.log('   No amount data available for ranges');
    }
    
    // 9. Get Recent Applications
    console.log('\n9. Getting recent applications...');
    const { data: recentApps, error: recentAppsError } = await supabase
      .from('applications')
      .select(`
        id,
        created_at,
        status,
        amount,
        client_id,
        company_id,
        client_name,
        company_name,
        application_type
      `)
      .eq('application_type', 'selected_plans')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (!recentAppsError && recentApps) {
      results.recentApplications = recentApps;
      console.log(`   Found ${recentApps.length} recent applications`);
      
      // Display a sample of the recent applications
      if (recentApps.length > 0) {
        console.log('   Sample of recent applications:');
        recentApps.slice(0, 3).forEach((app, i) => {
          console.log(`     ${i+1}. ID: ${app.id}, Client: ${app.client_name}, Company: ${app.company_name}, Status: ${app.status}, Created: ${new Date(app.created_at).toLocaleString()}`);
        });
      }
    } else {
      console.error('   Error getting recent applications:', recentAppsError);
    }
    
    // Write results to file
    fs.writeFileSync(
      'dashboard_data_may13_2025.json', 
      JSON.stringify(results, null, 2)
    );
    console.log('\nDashboard data check complete. Results saved to dashboard_data_may13_2025.json');
    
  } catch (error) {
    console.error('Error checking dashboard data:', error);
  }
}

// Run the check
checkDashboardData(); 