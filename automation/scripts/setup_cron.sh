#!/bin/bash
#
# 9:16 Agency Automation - Cron Setup Script
#
# This script sets up the cron jobs for the automation workflow.
# Run with: ./scripts/setup_cron.sh
#
# Schedule:
# - 9:00 AM: Scrape Meta Ad Library for new leads
# - 9:30 AM: Send Telegram notifications for new leads
# - 10:00 AM: Generate content for approved leads
# - 10:30 AM: Generate strategy packs
# - 11:00 AM: Send outreach emails
# - 6:00 PM: Send daily digest
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PYTHON_PATH="${PYTHON_PATH:-python3}"
LOG_DIR="${PROJECT_DIR}/logs"

# Create logs directory
mkdir -p "$LOG_DIR"

echo "Setting up cron jobs for 9:16 Agency Automation..."
echo "Project directory: $PROJECT_DIR"
echo "Python: $PYTHON_PATH"
echo ""

# Generate the cron entries
CRON_ENTRIES="
# 9:16 Agency Client Acquisition Automation
# ===========================================

# Initialize database (run once on setup)
# @reboot cd $PROJECT_DIR && $PYTHON_PATH main.py init >> $LOG_DIR/init.log 2>&1

# 9:00 AM - Scrape Meta Ad Library for new leads
0 9 * * * cd $PROJECT_DIR && $PYTHON_PATH main.py scrape --limit 50 >> $LOG_DIR/scrape.log 2>&1

# 9:30 AM - Send Telegram notifications for pending leads
30 9 * * * cd $PROJECT_DIR && $PYTHON_PATH main.py notify --limit 20 >> $LOG_DIR/notify.log 2>&1

# 10:00 AM - Generate content for approved leads
0 10 * * * cd $PROJECT_DIR && $PYTHON_PATH main.py generate --limit 10 >> $LOG_DIR/generate.log 2>&1

# 11:00 AM - Send outreach emails to content-ready leads
0 11 * * * cd $PROJECT_DIR && $PYTHON_PATH main.py send --limit 10 >> $LOG_DIR/send.log 2>&1

# 6:00 PM - Send daily digest to Telegram
0 18 * * * cd $PROJECT_DIR && $PYTHON_PATH main.py digest >> $LOG_DIR/digest.log 2>&1

# Hourly - Full pipeline run (optional, comment out if using individual jobs)
# 0 * * * * cd $PROJECT_DIR && $PYTHON_PATH main.py process --limit 10 >> $LOG_DIR/pipeline.log 2>&1

# Weekly log rotation (Sunday midnight)
0 0 * * 0 find $LOG_DIR -name '*.log' -mtime +7 -delete
"

echo "Proposed cron entries:"
echo "======================"
echo "$CRON_ENTRIES"
echo ""

read -p "Install these cron jobs? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Backup existing crontab
    crontab -l > /tmp/crontab_backup_$(date +%Y%m%d_%H%M%S).txt 2>/dev/null || true
    
    # Add new cron entries
    (crontab -l 2>/dev/null | grep -v "9:16 Agency" | grep -v "916 Agency" ; echo "$CRON_ENTRIES") | crontab -
    
    echo ""
    echo "✅ Cron jobs installed successfully!"
    echo ""
    echo "Current crontab:"
    crontab -l
else
    echo ""
    echo "Installation cancelled."
    echo ""
    echo "To install manually, run:"
    echo "  crontab -e"
    echo ""
    echo "And add the entries shown above."
fi

echo ""
echo "Log files will be written to: $LOG_DIR"
echo ""
echo "Useful commands:"
echo "  crontab -l          # View current cron jobs"
echo "  crontab -e          # Edit cron jobs"
echo "  tail -f $LOG_DIR/*.log  # Watch logs"
