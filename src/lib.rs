extern crate wasm_bindgen;
extern crate wasm_bindgen_futures;
extern crate web_sys;
extern crate serde;

use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::{future_to_promise, JsFuture};
use web_sys::{Request, RequestInit, RequestMode, Response};
use serde::{Serialize, Deserialize};
use js_sys::Promise;

#[wasm_bindgen]
extern {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
    
    pub fn alert(s: &str);
}

// Original greeting function
#[wasm_bindgen]
pub fn greet(name: &str) {
    alert(&format!("Hello, {}!", name));
}

// Enhanced GitHubRepo struct with image_url
#[derive(Serialize, Deserialize)]
struct GitHubRepo {
    name: String,
    description: Option<String>,
    html_url: String,
    language: Option<String>,
    stargazers_count: u32,
    forks_count: u32,
    #[serde(skip_deserializing)]
    image_url: Option<String>, // This will be populated from html_url
}

// Generate timestamp-based hash for OpenGraph URLs
fn generate_hash() -> String {
    let timestamp = js_sys::Date::now() as u64;
    format!("{:x}", timestamp / 1000)
}

// Extract owner and repo from GitHub URL
fn extract_repo_info(url: &str) -> Option<(String, String)> {
    let parts: Vec<&str> = url.split('/').collect();
    if parts.len() >= 5 && parts[2].contains("github.com") {
        Some((parts[3].to_string(), parts[4].to_string()))
    } else {
        None
    }
}

// Export fetch_repositories function to JavaScript
#[wasm_bindgen]
pub fn fetch_github_repos(username: &str) -> Promise {
    let username = username.to_string();
    
    log(&format!("Fetching repos for: {}", username));
    
    future_to_promise(async move {
        // Try to fetch from local storage first
        let window = web_sys::window().ok_or_else(|| {
            log("No window found");
            JsValue::from_str("No window found")
        })?;
        
        let storage = window.local_storage()
            .map_err(|_| JsValue::from_str("Failed to access localStorage"))?
            .ok_or_else(|| JsValue::from_str("localStorage not available"))?;
        
        let storage_key = format!("github_repos_{}", username);
        
        // Check if we have cached data - no time expiration check
        if let Ok(Some(cached_data)) = storage.get_item(&storage_key) {
            log("Found cached repository data, using it");
            
            // Parse the cached data
            let parse_result = js_sys::JSON::parse(&cached_data);
            if let Ok(repos) = parse_result {
                return Ok(repos);
            }
        }
        
        // If we get here, we need to fetch fresh data
        log("No cached data found, fetching fresh repository data from GitHub API");
        
        async fn fetch_with_hash(username: &str, retry: bool) -> Result<JsValue, JsValue> {
            let hash = generate_hash();
            let opts = RequestInit::new();
            opts.set_method("GET");
            opts.set_mode(RequestMode::Cors);
            
            let url = format!("https://api.github.com/users/{}/repos?sort=updated&per_page=10", username);
            log(&format!("Requesting URL: {}", url));
            
            let window = web_sys::window().ok_or_else(|| {
                log("No window found");
                JsValue::from_str("No window found")
            })?;
            
            let request = Request::new_with_str_and_init(&url, &opts)
                .map_err(|e| {
                    log(&format!("Request creation error: {:?}", e));
                    JsValue::from_str(&format!("Failed to create request: {:?}", e))
                })?;
            
            // Add headers
            request.headers().set("Accept", "application/vnd.github.v3+json")
                .map_err(|e| {
                    log(&format!("Header error: {:?}", e));
                    JsValue::from_str(&format!("Failed to set headers: {:?}", e))
                })?;
            
            log("Sending fetch request...");
            let resp_value = JsFuture::from(window.fetch_with_request(&request)).await
                .map_err(|e| {
                    log(&format!("Fetch error: {:?}", e));
                    JsValue::from_str(&format!("Failed to fetch: {:?}", e))
                })?;
            
            // Convert response to Response object
            log("Got response, converting...");
            let resp: Response = resp_value.dyn_into()
                .map_err(|e| {
                    log(&format!("Response conversion error: {:?}", e));
                    JsValue::from_str(&format!("Failed to convert response: {:?}", e))
                })?;
            
            // Check if response is successful
            if !resp.ok() {
                let status = resp.status();
                log(&format!("API error: {}", status));
                
                // If we get a 429 Too Many Requests and haven't retried yet, 
                // generate a new hash and retry once
                if status == 429 && !retry {
                    log("Too many requests error, retrying with new hash...");
                    // Sleep for 1 second before retry
                    JsFuture::from(js_sys::Promise::new(&mut |resolve, _| {
                        window.set_timeout_with_callback_and_timeout_and_arguments_0(
                            &resolve,
                            1000 // 1 second
                        ).expect("Failed to set timeout");
                    })).await?;
                    
                    return Box::pin(fetch_with_hash(username, true)).await;
                }
                
                return Err(JsValue::from_str(&format!("GitHub API error: {}", status)));
            }

            // Parse response JSON
            log("Parsing JSON response...");
            let json = JsFuture::from(resp.json().map_err(|e| {
                    log(&format!("JSON parsing error: {:?}", e));
                    e
                })?)
                .await
                .map_err(|e| {
                    log(&format!("JSON await error: {:?}", e));
                    JsValue::from_str(&format!("Failed to parse JSON: {:?}", e))
                })?;
            
            // Convert to native array for processing
            let repos_array = js_sys::Array::from(&json);
            
            // Process each repository to add image URL
            for i in 0..repos_array.length() {
                let repo = repos_array.get(i);
                let repo_obj = js_sys::Object::from(repo);
                
                // Get html_url
                let html_url = js_sys::Reflect::get(&repo_obj, &JsValue::from_str("html_url"))
                    .unwrap_or(JsValue::from_str(""))
                    .as_string()
                    .unwrap_or_default();
                    
                // Extract owner/repo from URL
                if let Some((owner, repo_name)) = extract_repo_info(&html_url) {
                    // Generate OpenGraph image URL with the hash
                    let image_url = format!("https://opengraph.githubassets.com/{}/{}/{}", hash, owner, repo_name);
                    
                    // Add the image_url to the repository object
                    js_sys::Reflect::set(
                        &repo_obj, 
                        &JsValue::from_str("image_url"), 
                        &JsValue::from_str(&image_url)
                    ).unwrap();
                }
            }
            
            log("Successfully processed repositories with image URLs");
            
            // Cache the results in localStorage
            let storage = window.local_storage()
                .map_err(|_| JsValue::from_str("Failed to access localStorage"))?
                .ok_or_else(|| JsValue::from_str("localStorage not available"))?;
            
            let storage_key = format!("github_repos_{}", username);
            let json_string = js_sys::JSON::stringify(&repos_array)
                .map_err(|_| JsValue::from_str("Failed to stringify repository data"))?;
            
            storage.set_item(&storage_key, &json_string.as_string().unwrap_or_default())
                .map_err(|_| JsValue::from_str("Failed to save repositories to localStorage"))?;
            
            // Also store timestamp
            let now = js_sys::Date::now();
            storage.set_item(&format!("{}_timestamp", &storage_key), &now.to_string())
                .map_err(|_| JsValue::from_str("Failed to save timestamp to localStorage"))?;
            
            log("Cached repository data to localStorage");
            
            Ok(repos_array.into())
        }
        
        // Start the fetch with retry = false
        fetch_with_hash(&username, false).await
    })
}

// Get language color based on language name
#[wasm_bindgen]
pub fn get_language_color(language: &str) -> String {
    match language {
        "JavaScript" => "#f1e05a".to_string(),
        "TypeScript" => "#3178c6".to_string(),
        "Python" => "#3572A5".to_string(),
        "Java" => "#b07219".to_string(),
        "C#" => "#178600".to_string(),
        "C++" => "#f34b7d".to_string(),
        "Ruby" => "#701516".to_string(),
        "Go" => "#00ADD8".to_string(),
        "Rust" => "#dea584".to_string(),
        "HTML" => "#e34c26".to_string(),
        "CSS" => "#563d7c".to_string(),
        "PHP" => "#4F5D95".to_string(),
        _ => "#8b949e".to_string(),
    }
}
