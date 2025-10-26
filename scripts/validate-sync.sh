#!/bin/bash

# Validation script for checking sync accuracy
# Usage: ./scripts/validate-sync.sh

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "🔍 FutAve Sync Validation Report"
echo "================================="
echo ""

# Test 1: Nottingham Forest (ID: 63) - Sample validation
echo "📊 Test 1: Nottingham Forest Player Stats"
echo "-------------------------------------------"
curl -s "$BASE_URL/api/v1/debug/compare?teamId=63&entity=playerstats" | \
  jq '{
    team: .teamName,
    totalPlayers: .comparison.totalLocalPlayers,
    sampled: .comparison.playersCompared,
    matchingInSample: .comparison.matching,
    notSampled: .comparison.withDiscrepancies,
    note: .note,
    status: (if .comparison.matching == .comparison.playersCompared then "✅ PASS: All sampled players match" else "❌ FAIL: Some sampled players have mismatches" end)
  }'
echo ""

# Test 2: Check validation history
echo "📋 Test 2: Recent Validation History"
echo "-------------------------------------"
curl -s "$BASE_URL/api/v1/debug/validations?limit=5" | \
  jq '{
    total: .summary.total,
    byStatus: .summary.byStatus,
    recentFailures: [.summary.recentFailures[] | {
      team: .teamName,
      entity: .entity,
      discrepancies: .totalDiscrepancies
    }]
  }'
echo ""

# Test 3: Player stats validation for multiple teams
echo "🏆 Test 3: Premier League Teams Sample"
echo "---------------------------------------"
for teamId in 63 14 18 10; do
  result=$(curl -s "$BASE_URL/api/v1/debug/compare?teamId=$teamId&entity=playerstats")
  teamName=$(echo "$result" | jq -r '.teamName')
  sampled=$(echo "$result" | jq -r '.comparison.playersCompared')
  matching=$(echo "$result" | jq -r '.comparison.matching')
  notSampled=$(echo "$result" | jq -r '.comparison.withDiscrepancies')

  if [ "$matching" == "$sampled" ]; then
    echo "  ✅ $teamName: $matching/$sampled sampled match ($notSampled not sampled)"
  else
    echo "  ❌ $teamName: $matching/$sampled sampled match ($notSampled not sampled)"
  fi
done
echo ""

# Test 4: Check for failed validations
echo "❌ Test 4: Recent Validation Failures"
echo "--------------------------------------"
curl -s "$BASE_URL/api/v1/debug/validations?status=fail&limit=3" | \
  jq '.validations[] | {
    team: .teamName,
    entity: .entity,
    discrepancies: .totalDiscrepancies,
    recommendation: .syncRecommendations[0].reason
  }'
echo ""

# Summary
echo "✅ Validation Complete!"
echo ""
echo "📝 Understanding Results:"
echo "  • 'sampled match' = Top active players checked against Sportmonks API"
echo "  • 'not sampled' = Players skipped to avoid excessive API calls"
echo "  • If all sampled players match = sync is working correctly ✅"
echo "  • If sampled players mismatch = sync needs attention ❌"
echo ""
echo "💡 Next Steps:"
echo "  1. If all tests show ✅ PASS = sync system is healthy"
echo "  2. If tests show ❌ FAIL, check: curl $BASE_URL/api/v1/debug/validations?status=fail"
echo "  3. Re-run specific syncs only if validation failures detected"
echo ""
