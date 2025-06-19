# Privacy Policy for CleanTube

**Last Updated:** June 19, 2025

This Privacy Policy describes how the CleanTube browser extension ("the extension," "we," "us," or "our") handles your data. 

This extension is designed to operate entirely on your local device.

## 1. Data We Handle and Why

According to the Chrome Web Store's User Data Policy, CleanTube handles the following types of data:

*   **User Activity:**
    *   **Watch Time Data:** The extension tracks the time you spend actively watching videos on YouTube. This data is aggregated and stored **exclusively on your local computer** using the `chrome.storage.local` API. This information is used for the sole purpose of displaying daily and weekly watch-time charts on the extension's Settings page for your personal review.
*   **Website Content:**
    *   The extension interacts with the content of `youtube.com` pages to provide its core, user-facing features. This includes hiding distracting elements (like recommendations and shorts) and overlaying the cooldown challenge. **The content of these pages is never collected, stored, or transmitted.**
*   **User-Generated Content:**
    *   **Settings:** Your preferences for features like Focus Hours, Session Cooldown, and comment visibility are stored **locally on your computer** via the `chrome.storage.local` API. This allows the extension to function according to your choices.
    *   **Cooldown Bypass Status:** A temporary flag is stored for the current session (`chrome.storage.session`) to remember if you have completed the cooldown challenge for a specific tab. This data is automatically deleted when the tab or browser is closed.

**Crucially, none of your watch time data or personal settings are ever transmitted, sent, or uploaded from your computer to any external server or third-party service. All data remains within your browser.**

## 2. Permissions Justification

CleanTube requests the minimum permissions necessary to function:

*   **`storage`:** This permission is required to save your settings and watch-time data on your local device, as described in Section 1. This allows the extension to persist your preferences and statistics between browsing sessions.
*   **`tabs`:** This permission is used to identify and close YouTube tabs when a Focus Hour period begins or when a Session Timer expires. It is also used to check a tab's URL to apply blocking rules and to inject the Cooldown Challenge on the correct page.
*   **`alarms`:** This permission is essential for the Session Timer and Focus Hours features. It allows the extension to reliably trigger events at a future time, even if the browser is not actively running.

## 3. Limited Use Compliance

Our use of your data complies with the Chrome Web Store's Limited Use requirements:

*   **Allowed Use:** Data is only used to provide and improve the direct, user-facing features of the extension (hiding distractions, providing statistics, and managing sessions).
*   **Allowed Transfer:** No data is transferred, as it is all stored locally. The only exception would be as part of a merger or acquisition, or if required by law.
*   **Prohibited Advertising:** We **never** use or transfer your data for serving personalized advertisements.
*   **Prohibited Human Interaction:** We do not have access to read any of your data, as it is not transmitted to us.

## 4. Data Sharing & Disclosure

We do not sell, trade, or otherwise transfer your data to outside parties because we do not collect or have access to it.

## 5. Data Retention

Data stored by this extension (`watchTime` history and user settings) remains on your local device until you either manually clear your browser's storage or uninstall the extension.

## 6. Children's Online Privacy Protection Act (COPPA)

We do not knowingly collect any information from anyone under 13 years of age. Our extension and its services are all directed to people who are at least 13 years old or older.

## 7. Changes to This Privacy Policy

We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.

## 8. Contact Us

If you have any questions about this Privacy Policy, you can contact us by opening an issue on our [GitHub repository](https://github.com/TitoNicolaDrugman/CleanTube).
