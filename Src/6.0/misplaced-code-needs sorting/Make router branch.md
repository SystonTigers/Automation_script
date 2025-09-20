{
  "make_router_branches": {
    "webhook_processing": {
      "video_processing_complete": {
        "filter": {
          "condition": "AND",
          "rules": [
            {
              "field": "event_type",
              "operator": "equal",
              "value": "video_processing_complete"
            }
          ]
        },
        "modules": [
          {
            "name": "HTTP - Make a request",
            "url": "{{apps_script_webhook_url}}",
            "method": "POST",
            "body": "{{webhook_payload}}"
          },
          {
            "name": "Condition - Check if upload needed",
            "condition": "{{status}} = completed AND {{output_url}} exists"
          },
          {
            "name": "YouTube - Upload video",
            "video_file": "{{output_url}}",
            "title": "{{clip_title}}",
            "description": "{{clip_caption}}"
          }
        ]
      },
      "youtube_upload_complete": {
        "filter": {
          "condition": "AND",
          "rules": [
            {
              "field": "event_type",
              "operator": "equal",
              "value": "youtube_upload_complete"
            }
          ]
        },
        "modules": [
          {
            "name": "HTTP - Make a request",
            "url": "{{apps_script_webhook_url}}",
            "method": "POST",
            "body": "{{webhook_payload}}"
          },
          {
            "name": "GitHub - Update repository",
            "action": "update_file",
            "file_path": "data/videos.json",
            "content": "{{updated_video_data}}"
          }
        ]
      },
      "canva_design_complete": {
        "filter": {
          "condition": "AND",
          "rules": [
            {
              "field": "event_type",
              "operator": "equal",
              "value": "canva_design_complete"
            }
          ]
        },
        "modules": [
          {
            "name": "HTTP - Make a request",
            "url": "{{apps_script_webhook_url}}",
            "method": "POST",
            "body": "{{webhook_payload}}"
          },
          {
            "name": "Condition - Check auto-post",
            "condition": "{{auto_post}} = true AND {{social_platform}} exists"
          },
          {
            "name": "Social Media - Post image",
            "platform": "{{social_platform}}",
            "image_url": "{{design_url}}",
            "caption": "{{social_caption}}"
          }
        ]
      },
      "email_fixture_received": {
        "filter": {
          "condition": "AND",
          "rules": [
            {
              "field": "event_type",
              "operator": "equal",
              "value": "email_fixture_received"
            }
          ]
        },
        "modules": [
          {
            "name": "Text Parser - Extract fixtures",
            "pattern": "{{fixture_parsing_pattern}}",
            "text": "{{email_body}}"
          },
          {
            "name": "HTTP - Make a request",
            "url": "{{apps_script_webhook_url}}",
            "method": "POST",
            "body": "{{parsed_fixture_data}}"
          }
        ]
      }
    },
    "system_health_monitoring": {
      "health_alert_critical": {
        "filter": {
          "condition": "AND",
          "rules": [
            {
              "field": "event_type",
              "operator": "equal",
              "value": "system_health_alert"
            },
            {
              "field": "health_score",
              "operator": "less_than",
              "value": "50"
            }
          ]
        },
        "modules": [
          {
            "name": "Email - Send notification",
            "to": "{{admin_email}}",
            "subject": "CRITICAL: Syston Tigers System Health Alert",
            "body": "Health Score: {{health_score}}%. Issues: {{issues_summary}}"
          },
          {
            "name": "SMS - Send alert",
            "to": "{{admin_phone}}",
            "message": "Syston Tigers automation system critical health alert"
          }
        ]
      },
      "health_alert_degraded": {
        "filter": {
          "condition": "AND",
          "rules": [
            {
              "field": "event_type",
              "operator": "equal",
              "value": "system_health_alert"
            },
            {
              "field": "health_score",
              "operator": "between",
              "value": ["50", "70"]
            }
          ]
        },
        "modules": [
          {
            "name": "Email - Send notification",
            "to": "{{admin_email}}",
            "subject": "WARNING: Syston Tigers System Performance Degraded",
            "body": "Health Score: {{health_score}}%. Components affected: {{affected_components}}"
          }
        ]
      }
    },
    "intelligent_batch_processing": {
      "auto_batch_fixtures": {
        "filter": {
          "condition": "AND",
          "rules": [
            {
              "field": "event_type",
              "operator": "equal",
              "value": "intelligent_batch_fixtures"
            },
            {
              "field": "fixture_count",
              "operator": "between",
              "value": ["2", "5"]
            }
          ]
        },
        "modules": [
          {
            "name": "Canva - Create design",
            "template_id": "{{get_template_by_count(fixture_count)}}",
            "placeholders": {
              "fixture_count": "{{fixture_count}}",
              "fixtures_list": "{{fixtures_data}}",
              "weekend_date": "{{weekend_period}}",
              "competition": "{{competition_type}}"
            }
          },
          {
            "name": "Social Media - Schedule posts",
            "platforms": ["instagram", "twitter", "facebook"],
            "schedule_time": "{{optimal_posting_time}}",
            "image": "{{canva_design_url}}"
          }
        ]
      }
    }
  },
  "canva_placeholders": {
    "system_health_templates": {
      "health_alert_template": [
        "health_score",
        "status_text",
        "affected_components",
        "issue_count",
        "last_check_time",
        "club_name",
        "system_version",
        "alert_level"
      ]
    },
    "video_processing_templates": {
      "video_ready_template": [
        "player_name",
        "goal_minute",
        "match_info",
        "youtube_url",
        "clip_duration",
        "processing_time",
        "video_quality",
        "club_name"
      ],
      "gotm_nominee_template": [
        "player_name",
        "goal_description",
        "match_date",
        "opponent",
        "vote_count",
        "voting_deadline",
        "youtube_url",
        "thumbnail_url",
        "month_year",
        "club_name"
      ],
      "gotm_winner_template": [
        "winner_name",
        "winning_goal_description",
        "vote_count",
        "total_votes",
        "winning_percentage",
        "runner_up",
        "month_year",
        "youtube_url",
        "celebration_message",
        "club_name"
      ]
    },
    "advanced_analytics_templates": {
      "performance_dashboard": [
        "total_events_processed",
        "success_rate",
        "avg_response_time",
        "peak_performance_time",
        "bottlenecks_identified",
        "cache_hit_rate",
        "api_call_count",
        "error_count",
        "system_uptime",
        "last_updated"
      ],
      "monthly_system_summary": [
        "month_year",
        "total_posts_created",
        "total_videos_processed",
        "total_fixtures_handled",
        "total_goals_tracked",
        "system_reliability",
        "user_engagement_metrics",
        "storage_usage",
        "api_usage_stats",
        "club_name"
      ]
    },
    "intelligent_scheduling_templates": {
      "adaptive_job_summary": [
        "job_name",
        "scheduled_time",
        "actual_execution_time",
        "execution_reason",
        "activity_level",
        "adjustment_made",
        "next_scheduled_run",
        "success_rate",
        "performance_impact",
        "club_name"
      ]
    },
    "webhook_security_templates": {
      "security_alert": [
        "alert_type",
        "threat_level",
        "blocked_ip",
        "attempted_payload",
        "timestamp",
        "action_taken",
        "security_score",
        "recommendations",
        "club_name",
        "system_admin"
      ]
    },
    "enhanced_fixture_templates": {
      "fixture_email_import": [
        "import_count",
        "source_email",
        "fixtures_added",
        "duplicates_skipped",
        "parsing_accuracy",
        "import_timestamp",
        "next_matches",
        "competition_breakdown",
        "club_name",
        "season"
      ]
    }
  },
  "webhook_endpoints": {
    "apps_script_webhooks": {
      "main_webhook": "https://script.google.com/macros/s/{{SCRIPT_ID}}/exec",
      "video_processing": "https://script.google.com/macros/s/{{SCRIPT_ID}}/exec?action=video_processing",
      "health_monitoring": "https://script.google.com/macros/s/{{SCRIPT_ID}}/exec?action=health_check",
      "fixture_import": "https://script.google.com/macros/s/{{SCRIPT_ID}}/exec?action=fixture_import"
    },
    "security_headers": {
      "required_headers": [
        "X-Make-Signature",
        "X-Make-Timestamp",
        "X-Make-Event-Type"
      ],
      "rate_limiting": {
        "requests_per_minute": 100,
        "burst_allowance": 200,
        "ip_blacklist_threshold": 1000
      }
    }
  },
  "circuit_breaker_configs": {
    "make_com": {
      "failure_threshold": 3,
      "recovery_timeout_ms": 300000,
      "half_open_max_calls": 5
    },
    "youtube_api": {
      "failure_threshold": 5,
      "recovery_timeout_ms": 600000,
      "half_open_max_calls": 3
    },
    "xbotgo_api": {
      "failure_threshold": 3,
      "recovery_timeout_ms": 180000,
      "half_open_max_calls": 2
    },
    "canva_api": {
      "failure_threshold": 4,
      "recovery_timeout_ms": 240000,
      "half_open_max_calls": 3
    }
  },
  "performance_monitoring": {
    "alert_thresholds": {
      "slow_operation_ms": 30000,
      "memory_leak_mb": 10,
      "error_rate_percent": 5,
      "cache_hit_rate_percent": 70
    },
    "metrics_to_track": [
      "api_response_time",
      "sheet_operation_time",
      "webhook_processing_time",
      "video_processing_time",
      "batch_operation_time",
      "memory_usage_delta",
      "cache_hit_miss_ratio",
      "error_count_by_type",
      "success_rate_by_component"
    ]
  },
  "advanced_scheduling": {
    "job_types": {
      "adaptive": {
        "description": "Jobs that adjust timing based on activity levels",
        "examples": ["player_stats_summary", "monthly_fixtures", "monthly_results"]
      },
      "workload_aware": {
        "description": "Jobs that consider system load and resources",
        "examples": ["video_processing", "batch_posting", "data_sync"]
      },
      "intelligent": {
        "description": "Jobs that use ML/heuristics for optimal timing",
        "examples": ["social_media_posting", "email_campaigns"]
      }
    },
    "activity_level_indicators": {
      "high": {
        "recent_events": ">20",
        "recent_matches": ">3",
        "api_calls_per_hour": ">100"
      },
      "normal": {
        "recent_events": "5-20",
        "recent_matches": "1-3",
        "api_calls_per_hour": "20-100"
      },
      "low": {
        "recent_events": "<5",
        "recent_matches": "<1",
        "api_calls_per_hour": "<20"
      }
    }
  },
  "data_synchronization": {
    "sync_strategies": {
      "real_time": {
        "description": "Immediate sync for critical data",
        "triggers": ["goal_scored", "card_shown", "match_events"],
        "max_delay_ms": 1000
      },
      "near_real_time": {
        "description": "Quick sync for important data",
        "triggers": ["substitutions", "match_status", "player_stats"],
        "max_delay_ms": 30000
      },
      "batch": {
        "description": "Periodic sync for bulk data",
        "triggers": ["fixture_lists", "historical_data", "analytics"],
        "max_delay_ms": 3600000
      }
    }
  },
  "quality_assurance": {
    "data_validation_rules": [
      {
        "field": "player_name",
        "rules": ["not_empty", "max_length:50", "valid_characters", "not_duplicate"]
      },
      {
        "field": "goal_minute",
        "rules": ["numeric", "min:0", "max:120", "reasonable_value"]
      },
      {
        "field": "score",
        "rules": ["numeric", "min:0", "max:20", "logical_progression"]
      }
    ],
    "automated_testing": {
      "unit_tests": ["validation_functions", "utility_classes", "calculation_logic"],
      "integration_tests": ["api_endpoints", "webhook_handlers", "sheet_operations"],
      "end_to_end_tests": ["complete_workflows", "error_scenarios", "performance_tests"]
    }
  }
}
