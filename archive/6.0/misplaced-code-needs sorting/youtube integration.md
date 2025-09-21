YouTube Integration - Make.com Router & Configuration

{
  "makecom_youtube_integration": {
    "router_branches": {
      "youtube_upload_execute": {
        "condition": "event_type = 'youtube_upload_execute'",
        "description": "Execute video upload to YouTube",
        "modules": [
          {
            "type": "youtube_upload_video",
            "parameters": {
              "oauth_connection": "{{youtube_oauth_connection}}",
              "title": "{{video_metadata.snippet.title}}",
              "description": "{{video_metadata.snippet.description}}",
              "privacy_status": "{{video_metadata.status.privacyStatus}}",
              "category_id": "{{video_metadata.snippet.categoryId}}",
              "tags": "{{video_metadata.snippet.tags}}",
              "video_file_path": "{{video_file_path}}",
              "default_language": "{{video_metadata.snippet.defaultLanguage}}",
              "embeddable": "{{video_metadata.status.embeddable}}",
              "license": "{{video_metadata.status.license}}",
              "public_stats_viewable": "{{video_metadata.status.publicStatsViewable}}"
            },
            "error_handling": {
              "retry_attempts": 3,
              "retry_delay": "exponential_backoff",
              "on_error": "call_error_callback"
            }
          },
          {
            "type": "condition",
            "condition": "youtube_upload.success = true",
            "then": [
              {
                "type": "http_request",
                "method": "POST",
                "url": "{{callback_url}}",
                "body": {
                  "event_type": "youtube_upload_success",
                  "video_id": "{{video_id}}",
                  "youtube_video_id": "{{youtube_upload.video_id}}",
                  "youtube_url": "https://www.youtube.com/watch?v={{youtube_upload.video_id}}",
                  "upload_date": "{{youtube_upload.upload_date}}",
                  "status": "success"
                }
              }
            ],
            "else": [
              {
                "type": "http_request",
                "method": "POST", 
                "url": "{{callback_url}}",
                "body": {
                  "event_type": "youtube_upload_error",
                  "video_id": "{{video_id}}",
                  "error": "{{youtube_upload.error}}",
                  "error_code": "{{youtube_upload.error_code}}",
                  "status": "error"
                }
              }
            ]
          }
        ]
      },
      
      "youtube_playlist_create": {
        "condition": "event_type = 'youtube_playlist_create'",
        "description": "Create new YouTube playlist",
        "modules": [
          {
            "type": "youtube_create_playlist",
            "parameters": {
              "oauth_connection": "{{youtube_oauth_connection}}",
              "title": "{{playlist_metadata.snippet.title}}",
              "description": "{{playlist_metadata.snippet.description}}",
              "privacy_status": "{{playlist_metadata.status.privacyStatus}}",
              "default_language": "{{playlist_metadata.snippet.defaultLanguage}}"
            }
          },
          {
            "type": "webhook_response",
            "body": {
              "success": true,
              "playlist_id": "{{youtube_playlist.id}}",
              "playlist_url": "https://www.youtube.com/playlist?list={{youtube_playlist.id}}"
            }
          }
        ]
      },
      
      "youtube_playlist_add_item": {
        "condition": "event_type = 'youtube_playlist_add_item'",
        "description": "Add video to YouTube playlist",
        "modules": [
          {
            "type": "youtube_add_playlist_item",
            "parameters": {
              "oauth_connection": "{{youtube_oauth_connection}}",
              "playlist_id": "{{playlist_id}}",
              "video_id": "{{video_id}}"
            }
          },
          {
            "type": "webhook_response",
            "body": {
              "success": true,
              "playlist_item_id": "{{youtube_playlist_item.id}}"
            }
          }
        ]
      },
      
      "youtube_get_analytics": {
        "condition": "event_type = 'youtube_get_analytics'",
        "description": "Fetch YouTube video analytics",
        "modules": [
          {
            "type": "youtube_get_video_statistics",
            "parameters": {
              "api_key": "{{api_key}}",
              "video_id": "{{video_id}}",
              "part": "statistics,snippet"
            }
          },
          {
            "type": "webhook_response",
            "body": {
              "success": true,
              "analytics": {
                "view_count": "{{youtube_statistics.viewCount}}",
                "like_count": "{{youtube_statistics.likeCount}}",
                "comment_count": "{{youtube_statistics.commentCount}}",
                "favorite_count": "{{youtube_statistics.favoriteCount}}",
                "duration": "{{youtube_snippet.duration}}",
                "published_at": "{{youtube_snippet.publishedAt}}"
              }
            }
          }
        ]
      },
      
      "video_compilation_request": {
        "condition": "event_type = 'video_compilation_request'",
        "description": "Request video compilation for highlight reels",
        "modules": [
          {
            "type": "cloudconvert_create_job",
            "parameters": {
              "api_key": "{{cloudconvert_api_key}}",
              "job_tasks": {
                "import_clips": {
                  "operation": "import/upload",
                  "files": "{{compilation_data.clips}}"
                },
                "concatenate_videos": {
                  "operation": "convert",
                  "input": "import_clips",
                  "output_format": "{{output_format}}",
                  "options": {
                    "video_codec": "h264",
                    "audio_codec": "aac",
                    "quality": "{{quality}}",
                    "concatenate": true,
                    "add_intro": "{{include_intro}}",
                    "add_outro": "{{include_outro}}"
                  }
                },
                "export_compilation": {
                  "operation": "export/url",
                  "input": "concatenate_videos"
                }
              },
              "webhook_url": "{{callback_url}}"
            }
          },
          {
            "type": "webhook_response",
            "body": {
              "success": true,
              "compilation_id": "{{cloudconvert_job.id}}",
              "status": "processing"
            }
          }
        ]
      },
      
      "compilation_complete": {
        "condition": "event_type = 'compilation_complete'",
        "description": "Handle completed video compilation",
        "modules": [
          {
            "type": "condition",
            "condition": "status = 'finished'",
            "then": [
              {
                "type": "youtube_upload_video",
                "parameters": {
                  "oauth_connection": "{{youtube_oauth_connection}}",
                  "title": "{{compilation_title}}",
                  "description": "{{compilation_description}}",
                  "privacy_status": "public",
                  "category_id": "17",
                  "video_file_url": "{{download_url}}"
                }
              },
              {
                "type": "google_sheets_append",
                "parameters": {
                  "spreadsheet_id": "{{spreadsheet_id}}",
                  "sheet_name": "YouTube Videos",
                  "values": [
                    "{{youtube_upload.video_id}}",
                    "{{compilation_id}}",
                    "", 
                    "{{compilation_title}}",
                    "{{compilation_description}}",
                    "https://www.youtube.com/watch?v={{youtube_upload.video_id}}",
                    "public",
                    "{{now}}",
                    "{{compilation_duration}}",
                    "0",
                    "0", 
                    "0",
                    "{{compilation_tags}}",
                    "17",
                    "{{monthly_highlights_playlist_id}}",
                    "PUBLISHED",
                    ""
                  ]
                }
              }
            ]
          }
        ]
      }
    },
    
    "scheduled_automations": [
      {
        "name": "Process YouTube Upload Queue",
        "schedule": "every 15 minutes",
        "trigger": {
          "type": "apps_script",
          "function": "processYouTubeUploadQueue"
        }
      },
      {
        "name": "Update Video Analytics",
        "schedule": "daily at 6:00 AM",
        "trigger": {
          "type": "apps_script", 
          "function": "updateAllYouTubeVideoAnalytics"
        }
      },
      {
        "name": "Generate Monthly Highlight Reel",
        "schedule": "1st day of month at 10:00 AM",
        "trigger": {
          "type": "apps_script",
          "function": "generateMonthlyHighlightReel",
          "parameters": {
            "month": "{{previous_month_yyyy_mm}}"
          }
        }
      }
    ]
  },
  
  "youtube_api_configuration": {
    "base_url": "https://www.googleapis.com/youtube/v3",
    "required_scopes": [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/youtube.readonly"
    ],
    "quota_limits": {
      "daily_quota": 10000,
      "upload_cost": 1600,
      "playlist_create_cost": 50,
      "playlist_insert_cost": 50,
      "video_list_cost": 1
    },
    "default_settings": {
      "category_id": "17", 
      "default_language": "en",
      "privacy_status": "unlisted",
      "embeddable": true,
      "license": "youtube",
      "public_stats_viewable": true
    }
  },
  
  "canva_templates": {
    "youtube_thumbnail": {
      "template_name": "YouTube Video Thumbnail",
      "dimensions": "1280x720",
      "placeholders": [
        {
          "name": "player_name",
          "type": "text",
          "description": "Goal scorer name",
          "example": "James Smith"
        },
        {
          "name": "goal_minute",
          "type": "text", 
          "description": "Goal minute with apostrophe",
          "example": "23'"
        },
        {
          "name": "match_info",
          "type": "text",
          "description": "Match information",
          "example": "vs Melton Town"
        },
        {
          "name": "club_logo",
          "type": "image",
          "description": "Club logo/badge",
          "example": "syston_tigers_logo.png"
        },
        {
          "name": "background_action",
          "type": "image", 
          "description": "Action shot background",
          "example": "goal_action.jpg"
        }
      ]
    },
    
    "monthly_highlight_reel_thumbnail": {
      "template_name": "Monthly Highlight Reel Thumbnail",
      "dimensions": "1280x720",
      "placeholders": [
        {
          "name": "month_name",
          "type": "text",
          "description": "Month and year",
          "example": "September 2025"
        },
        {
          "name": "goal_count",
          "type": "text",
          "description": "Total goals in month", 
          "example": "12"
        },
        {
          "name": "club_name",
          "type": "text",
          "description": "Club name",
          "example": "Syston Tigers"
        },
        {
          "name": "highlight_images",
          "type": "image_collection",
          "description": "Collection of goal thumbnails",
          "example": ["goal1.jpg", "goal2.jpg", "goal3.jpg"]
        },
        {
          "name": "club_logo",
          "type": "image",
          "description": "Club logo/badge",
          "example": "syston_tigers_logo.png"
        }
      ]
    },
    
    "youtube_end_screen": {
      "template_name": "YouTube End Screen Template",
      "dimensions": "1920x1080", 
      "placeholders": [
        {
          "name": "subscribe_message",
          "type": "text",
          "description": "Call to action for subscribing",
          "example": "Subscribe for more Syston Tigers content!"
        },
        {
          "name": "next_video_thumbnail",
          "type": "image",
          "description": "Thumbnail of suggested next video",
          "example": "next_video_thumb.jpg"
        },
        {
          "name": "club_logo",
          "type": "image",
          "description": "Club logo/badge",
          "example": "syston_tigers_logo.png"
        },
        {
          "name": "social_media_handles",
          "type": "text",
          "description": "Social media information",
          "example": "@SystonTigersFC"
        }
      ]
    }
  },
  
  "error_handling": {
    "upload_failures": {
      "retry_attempts": 3,
      "retry_delays": [300, 900, 1800],
      "fallback_actions": [
        "queue_for_manual_review",
        "notify_admin",
        "log_detailed_error"
      ]
    },
    "quota_exceeded": {
      "detection_methods": ["api_response_code", "quota_tracking"],
      "actions": [
        "pause_uploads_until_reset",
        "prioritize_high_priority_queue",
        "notify_admin_of_quota_status"
      ]
    },
    "api_errors": {
      "authentication_failed": "refresh_oauth_token",
      "invalid_video_format": "convert_video_format",
      "copyright_claim": "flag_for_review",
      "community_guidelines": "flag_for_review"
    }
  },
  
  "webhook_security": {
    "required_headers": [
      "X-Make-Signature",
      "Content-Type"
    ],
    "signature_verification": true,
    "rate_limiting": {
      "requests_per_minute": 60,
      "burst_allowance": 10
    }
  },
  
  "integration_testing": {
    "test_scenarios": [
      {
        "name": "Single Video Upload",
        "description": "Test basic video upload functionality",
        "test_data": {
          "title": "Test Goal - Player Name 45'",
          "description": "Test video upload",
          "privacy_status": "private"
        },
        "expected_outcome": "successful_upload_with_url"
      },
      {
        "name": "Playlist Creation and Addition",
        "description": "Test playlist creation and video addition",
        "test_steps": [
          "create_test_playlist",
          "upload_test_video", 
          "add_video_to_playlist"
        ],
        "expected_outcome": "video_in_playlist"
      },
      {
        "name": "Analytics Retrieval",
        "description": "Test analytics data fetching",
        "test_data": {
          "video_id": "test_video_id"
        },
        "expected_outcome": "analytics_data_returned"
      },
      {
        "name": "Monthly Compilation",
        "description": "Test monthly highlight reel generation",
        "test_data": {
          "month": "2025-09",
          "clip_count": 5
        },
        "expected_outcome": "compilation_uploaded"
      }
    ]
  }
}


