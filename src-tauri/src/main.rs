// Prevents an extra console window from appearing alongside the app on Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    post_conjurer_lib::run()
}
