mod cloud;
mod commands;
mod db;
mod models;
mod models_collab;
mod models_sysml;

use cloud::commands::{
    cloud_current_session, cloud_download_share, cloud_list_shares, cloud_share_project, cloud_sign_in,
    cloud_sign_out, cloud_sign_up, cloud_storage_usage,
};
use commands::activity::list_activity;
use commands::attachments::{add_attachment, delete_attachment, list_attachments};
use commands::baselines::{compare_baseline, create_baseline, list_baselines};
use commands::comments::{list_comments, list_notifications, mark_all_notifications_read, mark_notification_read, save_comment};
use commands::decisions::{list_decisions, save_decision};
use commands::diagrams::{create_diagram, delete_diagram, get_diagram_detail, list_diagrams, save_diagram_layout};
use commands::export::{export_project, import_project};
use commands::meeting_notes::{list_meeting_notes, save_meeting_note};
use commands::members::{add_member, list_members, remove_member, update_member_role};
use commands::milestones::{delete_milestone, list_milestones, save_milestone};
use commands::projects::{archive_project, create_project, list_projects};
use commands::requirements::{
    create_trace_link, find_orphan_requirements, list_requirements, list_trace_links, save_requirement,
};
use commands::risks::{list_risks, save_risk};
use commands::saved_views::{delete_view, list_views, save_view};
use commands::search::search_all;
use commands::sprints::{delete_sprint, list_sprints, save_sprint};
use commands::sysml_elements::{delete_sysml_element, list_sysml_elements, save_sysml_element};
use commands::task_links::{create_task_link, delete_task_link, list_task_links};
use commands::tasks::{delete_task, list_tasks, save_task};
use commands::validation::validate_project;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(db::init_db())
        .invoke_handler(tauri::generate_handler![
            create_project,
            list_projects,
            archive_project,
            save_task,
            list_tasks,
            delete_task,
            save_requirement,
            list_requirements,
            create_trace_link,
            list_trace_links,
            find_orphan_requirements,
            search_all,
            export_project,
            import_project,
            save_milestone,
            list_milestones,
            delete_milestone,
            save_risk,
            list_risks,
            save_decision,
            list_decisions,
            save_meeting_note,
            list_meeting_notes,
            create_baseline,
            list_baselines,
            compare_baseline,
            save_sysml_element,
            list_sysml_elements,
            delete_sysml_element,
            create_diagram,
            list_diagrams,
            delete_diagram,
            get_diagram_detail,
            save_diagram_layout,
            validate_project,
            list_members,
            add_member,
            update_member_role,
            remove_member,
            save_comment,
            list_comments,
            list_notifications,
            mark_notification_read,
            mark_all_notifications_read,
            save_sprint,
            list_sprints,
            delete_sprint,
            save_view,
            list_views,
            delete_view,
            list_activity,
            add_attachment,
            list_attachments,
            delete_attachment,
            create_task_link,
            list_task_links,
            delete_task_link,
            cloud_sign_up,
            cloud_sign_in,
            cloud_sign_out,
            cloud_current_session,
            cloud_share_project,
            cloud_list_shares,
            cloud_download_share,
            cloud_storage_usage,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AetherPM");
}
