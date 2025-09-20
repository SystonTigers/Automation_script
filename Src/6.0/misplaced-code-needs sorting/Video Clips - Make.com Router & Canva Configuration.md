{
  "makecom_router_branches": {
    "video_processing": {
      "cloudconvert_process": {
        "condition": "event_type = 'cloudconvert_process'",
        "modules": [
          {
            "type": "cloudconvert_create_job",
            "parameters": {
              "api_key": "{{cloudconvert_api_key}}",
              "job_payload": "{{cloudconvert_job}}",
              "webhook_url": "{{callback_url}}"
            }
          },
          {
            "type": "webhook_response",
            "parameters": {
              "status": "success",
              "job_id": "{{cloudconvert_job_id}}"
            }
          }
        ]
      },
      "cloudconvert_callback": {
        "condition": "event_type = 'cloudconvert_callback'",
        "modules": [
          {
            "type": "apps_script",
            "function": "handleCloudConvertCallback",
            "parameters": {
              "webhook_data": "{{webhook_data}}"
            }
          }
        ]
      },
      "youtube_upload": {
        "condition": "event_type = 'youtube_upload'",
        "modules": [
          {
            "type": "youtube_upload_video",
            "parameters": {
              "title": "{{title}}",
              "description": "{{description}}",
              "privacy_status": "{{privacy_status}}",
              "category_id": "{{category_id}}",
              "tags": "{{tags}}",
              "video_file": "{{video_file_path}}",
              "callback_url": "{{callback_url}}"
            }
          },
          {
            "type": "google_sheets_update",
            "parameters": {
              "spreadsheet_id": "{{spreadsheet_id}}",
              "range": "Video Clips!K:K",
              "search_column": "B",
              "search_value": "{{clip_id}}",
              "update_value": "{{youtube_url}}"
            }
          }
        ]
      },
      "youtube_callback": {
        "condition": "event_type = 'youtube_callback'",
        "modules": [
          {
            "type": "apps_script",
            "function": "handleYouTubeCallback",
            "parameters": {
              "callback_data": "{{callback_data}}"
            }
          }
        ]
      },
      "video_share": {
        "condition": "event_type = 'video_share'",
        "modules": [
          {
            "type": "facebook_post",
            "condition": "platforms contains 'facebook'",
            "parameters": {
              "message": "{{facebook_text}}",
              "link": "{{youtube_url}}",
              "page_id": "{{facebook_page_id}}"
            }
          },
          {
            "type": "twitter_tweet",
            "condition": "platforms contains 'twitter'",
            "parameters": {
              "status": "{{twitter_text}}",
              "media_urls": "{{youtube_url}}"
            }
          },
          {
            "type": "instagram_post",
            "condition": "platforms contains 'instagram'",
            "parameters": {
              "caption": "{{instagram_caption}}",
              "media_url": "{{youtube_url}}"
            }
          }
        ]
      }
    },
    "goal_of_the_month": {
      "gotm_voting_open": {
        "condition": "event_type = 'gotm_voting_open'",
        "modules": [
          {
            "type": "canva_design",
            "template_id": "gotm_voting_announcement",
            "parameters": {
              "month_name": "{{month_name}}",
              "goal_count": "{{goal_count}}",
              "voting_period": "{{voting_period}}",
              "club_name": "{{club_name}}",
              "goals_list": "{{goals_list}}",
              "voting_url": "{{voting_url}}"
            }
          },
          {
            "type": "social_media_post",
            "platforms": ["facebook", "twitter", "instagram"],
            "content": {
              "image": "{{canva_output_url}}",
              "caption": "🗳️ Goal of the Month voting is now OPEN! Vote for your favourite goal from {{month_name}}. {{voting_url}}"
            }
          }
        ]
      },
      "gotm_voting_closed": {
        "condition": "event_type = 'gotm_voting_closed'",
        "modules": [
          {
            "type": "canva_design",
            "template_id": "gotm_voting_closed",
            "parameters": {
              "month_name": "{{month_name}}",
              "total_votes": "{{total_votes}}",
              "club_name": "{{club_name}}",
              "winner_announcement_date": "{{winner_announcement_date}}"
            }
          },
          {
            "type": "social_media_post",
            "platforms": ["facebook", "twitter", "instagram"],
            "content": {
              "image": "{{canva_output_url}}",
              "caption": "🔒 Voting is now CLOSED! {{total_votes}} votes cast for {{month_name}} Goal of the Month. Winner announced tomorrow!"
            }
          }
        ]
      },
      "gotm_winner_announcement": {
        "condition": "event_type = 'gotm_winner_announcement'",
        "modules": [
          {
            "type": "canva_design",
            "template_id": "gotm_winner_announcement",
            "parameters": {
              "winner_player": "{{winner_player}}",
              "winner_minute": "{{winner_minute}}",
              "winner_opponent": "{{winner_opponent}}",
              "winner_date": "{{winner_date}}",
              "month_name": "{{month_name}}",
              "vote_percentage": "{{vote_percentage}}",
              "total_votes": "{{total_votes}}",
              "club_name": "{{club_name}}",
              "youtube_url": "{{winner_youtube_url}}",
              "runner_up_player": "{{runner_up_player}}",
              "third_place_player": "{{third_place_player}}"
            }
          },
          {
            "type": "social_media_post",
            "platforms": ["facebook", "twitter", "instagram"],
            "content": {
              "image": "{{canva_output_url}}",
              "caption": "🏆 GOAL OF THE MONTH WINNER! 🏆\n\n{{winner_player}}'s {{winner_minute}}' strike vs {{winner_opponent}} wins {{month_name}} with {{vote_percentage}}% of votes!\n\nWatch it again: {{winner_youtube_url}}\n\n#GoalOfTheMonth #{{club_name}}"
            }
          },
          {
            "type": "youtube_pin_comment",
            "parameters": {
              "video_url": "{{winner_youtube_url}}",
              "comment": "🏆 GOAL OF THE MONTH WINNER! This incredible strike by {{winner_player}} won {{month_name}} with {{vote_percentage}}% of your votes. Thanks to everyone who participated!"
            }
          }
        ]
      }
    }
  },
  
  "canva_templates": {
    "video_clip_thumbnail": {
      "template_name": "Goal Clip Thumbnail",
      "dimensions": "1920x1080",
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
          "description": "Minute when goal was scored",
          "example": "23'"
        },
        {
          "name": "club_name",
          "type": "text",
          "description": "Club name",
          "example": "Syston Tigers"
        },
        {
          "name": "opponent_name",
          "type": "text",
          "description": "Opposition team name",
          "example": "Melton Town"
        },
        {
          "name": "competition",
          "type": "text",
          "description": "Competition name",
          "example": "Leicestershire Senior League"
        },
        {
          "name": "match_date",
          "type": "text",
          "description": "Match date",
          "example": "17 Sep 2025"
        },
        {
          "name": "goal_type",
          "type": "text",
          "description": "Type of goal",
          "example": "Penalty / Header / Shot"
        },
        {
          "name": "home_score",
          "type": "text",
          "description": "Home team score",
          "example": "2"
        },
        {
          "name": "away_score",
          "type": "text",
          "description": "Away team score",
          "example": "1"
        },
        {
          "name": "club_logo",
          "type": "image",
          "description": "Club logo/badge",
          "example": "logo.png"
        }
      ]
    },
    
    "gotm_voting_announcement": {
      "template_name": "Goal of the Month - Voting Open",
      "dimensions": "1080x1080",
      "placeholders": [
        {
          "name": "month_name",
          "type": "text",
          "description": "Month name for voting",
          "example": "September 2025"
        },
        {
          "name": "goal_count",
          "type": "text",
          "description": "Number of goals to vote on",
          "example": "5"
        },
        {
          "name": "voting_period",
          "type": "text",
          "description": "Voting period dates",
          "example": "1st - 7th October"
        },
        {
          "name": "club_name",
          "type": "text",
          "description": "Club name",
          "example": "Syston Tigers"
        },
        {
          "name": "voting_url",
          "type": "text",
          "description": "URL for voting",
          "example": "vote.systontigers.com"
        },
        {
          "name": "goals_preview",
          "type": "image_collection",
          "description": "Thumbnail images of goals to vote on",
          "example": ["goal1_thumb.jpg", "goal2_thumb.jpg"]
        },
        {
          "name": "club_logo",
          "type": "image",
          "description": "Club logo/badge",
          "example": "logo.png"
        }
      ]
    },
    
    "gotm_voting_closed": {
      "template_name": "Goal of the Month - Voting Closed",
      "dimensions": "1080x1080",
      "placeholders": [
        {
          "name": "month_name",
          "type": "text",
          "description": "Month name for voting",
          "example": "September 2025"
        },
        {
          "name": "total_votes",
          "type": "text",
          "description": "Total number of votes cast",
          "example": "247"
        },
        {
          "name": "club_name",
          "type": "text",
          "description": "Club name",
          "example": "Syston Tigers"
        },
        {
          "name": "winner_announcement_date",
          "type": "text",
          "description": "When winner will be announced",
          "example": "Tomorrow 6pm"
        },
        {
          "name": "club_logo",
          "type": "image",
          "description": "Club logo/badge",
          "example": "logo.png"
        }
      ]
    },
    
    "gotm_winner_announcement": {
      "template_name": "Goal of the Month - Winner",
      "dimensions": "1080x1080",
      "placeholders": [
        {
          "name": "winner_player",
          "type": "text",
          "description": "Winning goal scorer",
          "example": "James Smith"
        },
        {
          "name": "winner_minute",
          "type": "text",
          "description": "Minute of winning goal",
          "example": "23'"
        },
        {
          "name": "winner_opponent",
          "type": "text",
          "description": "Opposition for winning goal",
          "example": "Melton Town"
        },
        {
          "name": "winner_date",
          "type": "text",
          "description": "Date of winning goal",
          "example": "14 Sep 2025"
        },
        {
          "name": "month_name",
          "type": "text",
          "description": "Month name",
          "example": "September 2025"
        },
        {
          "name": "vote_percentage",
          "type": "text",
          "description": "Percentage of votes won",
          "example": "42%"
        },
        {
          "name": "total_votes",
          "type": "text",
          "description": "Total votes cast",
          "example": "247"
        },
        {
          "name": "club_name",
          "type": "text",
          "description": "Club name",
          "example": "Syston Tigers"
        },
        {
          "name": "winner_thumbnail",
          "type": "image",
          "description": "Thumbnail of winning goal",
          "example": "winner_goal.jpg"
        },
        {
          "name": "runner_up_player",
          "type": "text",
          "description": "Second place goal scorer",
          "example": "Mike Johnson"
        },
        {
          "name": "third_place_player",
          "type": "text",
          "description": "Third place goal scorer",
          "example": "Tom Wilson"
        },
        {
          "name": "club_logo",
          "type": "image",
          "description": "Club logo/badge",
          "example": "logo.png"
        }
      ]
    },
    
    "video_highlight_reel": {
      "template_name": "Monthly Video Highlight Reel Intro",
      "dimensions": "1920x1080",
      "placeholders": [
        {
          "name": "month_name",
          "type": "text",
          "description": "Month being highlighted",
          "example": "September 2025"
        },
        {
          "name": "total_goals",
          "type": "text",
          "description": "Total goals scored in month",
          "example": "12"
        },
        {
          "name": "matches_played",
          "type": "text",
          "description": "Number of matches played",
          "example": "4"
        },
        {
          "name": "club_name",
          "type": "text",
          "description": "Club name",
          "example": "Syston Tigers"
        },
        {
          "name": "season",
          "type": "text",
          "description": "Current season",
          "example": "2025/26"
        },
        {
          "name": "club_logo",
          "type": "image",
          "description": "Club logo/badge",
          "example": "logo.png"
        },
        {
          "name": "background_action",
          "type": "video",
          "description": "Background action footage",
          "example": "action_montage.mp4"
        }
      ]
    }
  },
  
  "webhook_endpoints": {
    "base_url": "https://hook.eu2.make.com/your-webhook-id",
    "endpoints": {
      "cloudconvert_process": "/cloudconvert-process",
      "cloudconvert_callback": "/cloudconvert-callback", 
      "youtube_upload": "/youtube-upload",
      "youtube_callback": "/youtube-callback",
      "video_share": "/video-share",
      "gotm_voting_open": "/gotm-voting-open",
      "gotm_voting_closed": "/gotm-voting-closed",
      "gotm_winner_announcement": "/gotm-winner-announcement"
    }
  },
  
  "required_integrations": {
    "cloudconvert": {
      "api_key": "Required",
      "webhook_signing_secret": "Required for security",
      "supported_formats": ["mp4", "mov", "avi", "mkv"],
      "max_file_size": "2GB",
      "processing_timeout": "600 seconds"
    },
    "youtube": {
      "api_key": "YouTube Data API v3 key required",
      "oauth_client_id": "Required for uploads",
      "oauth_client_secret": "Required for uploads", 
      "channel_id": "Target channel for uploads",
      "default_privacy": "unlisted",
      "category_id": "17"
    },
    "social_media": {
      "facebook": {
        "page_access_token": "Required for page posting",
        "page_id": "Target Facebook page ID"
      },
      "twitter": {
        "api_key": "Twitter API v2 key",
        "api_secret": "Twitter API v2 secret",
        "access_token": "Account access token",
        "access_token_secret": "Account access token secret"
      },
      "instagram": {
        "access_token": "Instagram Basic Display API token",
        "user_id": "Instagram user ID"
      }
    }
  },
  
  "automation_triggers": {
    "scheduled": [
      {
        "name": "Process Video Clips Queue",
        "function": "processVideoClipsQueue",
        "schedule": "every 15 minutes",
        "description": "Process pending video clips in queue"
      },
      {
        "name": "GOTM Voting Open",
        "function": "openGOTMVoting", 
        "schedule": "1st day of month at 9:00 AM",
        "description": "Open Goal of the Month voting"
      },
      {
        "name": "GOTM Voting Closed",
        "function": "closeGOTMVoting",
        "schedule": "7th day of month at 11:59 PM", 
        "description": "Close Goal of the Month voting"
      },
      {
        "name": "GOTM Winner Announcement",
        "function": "announceGOTMWinner",
        "schedule": "8th day of month at 6:00 PM",
        "description": "Announce Goal of the Month winner"
      }
    ]
  },
  
  "error_handling": {
    "retry_attempts": 3,
    "retry_delay": "exponential_backoff",
    "fallback_methods": [
      {
        "primary": "ffmpeg_local",
        "fallback": "cloudconvert_cloud"
      },
      {
        "primary": "youtube_direct_upload",
        "fallback": "youtube_via_make"
      }
    ],
    "notification_channels": [
      "email",
      "slack",
      "system_logs"
    ]
  }
}
