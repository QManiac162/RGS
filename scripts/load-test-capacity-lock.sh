#!/usr/bin/env bash
# Fires N concurrent reservation requests against the same capacity window, each requesting the entire remaining capacity.
# Because of the REDIS lock + Postgres transaction, exactly 1 request must sucdeed and all others must be rejected
# Never more capacity booked than exists

set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://localhost:3001}"
TERMINAL_CODE="${1:-IRN}"
WINDOW_START="${2:-$(date -u +%Y-%m-%dT08:00:00.000Z)}"
UNITS_REQUESTED="${3:-16}"
CONCURRENCY="${4:-16}"

echo "Target:       $GATEWAY_URL/terminals/$TERMINAL_CODE/capacity/reserve"
echo "windowStart: $WINDOW_START"
echo "units/req:   $UNITS_REQUESTED"
echo "concurrency: $CONCURRENCY"
echo "--------------------------------------------------------------------"

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

for i in $(seq 1 "$CONCURRENCY"); do
    (
        curl -s -o "$TMP_DIR/resp_$i.json" -w "%{http_code}" \
        -X POST "$GATEWAY_URL/terminals/$TERMINAL_CODE/capacity/reserve" \
        -H "Content-Type: application/json" \
        -d "{\"windowStart\":\"$WINDOW_START\",\"unitsRequested\":$UNITS_REQUESTED}" \
        > "$TMP_DIR/status_$i.txt"
    ) &
done
wait

SUCCESS_COUNT=0
REJECTED_COUNT=0
OTHER_COUNT=0

for i in $(seq 1 "$CONCURRENCY"); do
    STATUS=$(cat "$TMP_DIR/status_$i.txt")
    if [ "$STATUS" = "200" ]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    elif [ "$STATUS" = "409" ]; then
        REJECTED_COUNT=$((REJECTED_COUNT + 1))
    else
        OTHER_COUNT=$((OTHER_COUNT + 1))
        echo "Unexpected status $STATUS on request $i:"
        cat "$TMP_DIR/resp_$i.json"
    fi
done

echo "--------------------------------------------------------------------"
echo "Successful reservations (200): $SUCCESS_COUNT"
echo "Rejected, no overbooking (409): $REJECTED_COUNT"
echo "Unexpected responses: $OTHER_COUNT"

if [ "$SUCCESS_COUNT" -eq 1 ]; then
    echo "PASS: exactly one request won the race."
else
    echo "FAIL: expected exactly 1 success, got $SUCCESS_COUNT."
    exit 1
fi