<script setup lang="ts">
import { githubUrl } from '~/site'

const issuesUrl = `${githubUrl}/issues`

useSeoMeta({
  title: 'Privacy Policy — NativeType',
  description: 'NativeType keeps your writing on your device. Optional usage statistics are off by default and do not include drafts or translated text.',
})
</script>

<template>
  <article class="text-page policy">
    <h1>NativeType Privacy Policy</h1>
    <p class="policy-tagline">Write in your language. Publish in another.</p>
    <p class="policy-meta"><strong>Last updated: <time datetime="2026-10-27">October 27, 2026</time></strong></p>

    <h2>Privacy at a Glance</h2>
    <p>NativeType is a browser extension designed to help you write in one language and publish in another.</p>
    <p>Your writing stays on your device. NativeType uses Chrome's built-in translation capabilities and does not send your drafts or translated text to NativeType servers.</p>
    <p>Optional usage statistics are disabled by default. If you choose to enable them, NativeType sends limited usage events and a randomly generated installation identifier to help us understand how the extension is used and improve its reliability.</p>
    <p>We do not sell your data or use your writing for advertising.</p>

    <h2>1. About This Policy</h2>
    <p>This Privacy Policy explains how NativeType ("we", "our", or "the extension") accesses, processes, stores, and protects information.</p>
    <p>It applies to:</p>
    <ul>
      <li>The NativeType Chrome extension.</li>
      <li>The NativeType website at <a href="https://typewith.si">https://typewith.si</a>.</li>
      <li>The NativeType API used for optional usage statistics.</li>
    </ul>
    <p>NativeType is an experimental, open-source project. Its primary purpose is to make writing across languages easier while minimizing unnecessary data collection.</p>

    <h2>2. Information Accessed for Translation</h2>
    <p>NativeType operates within supported text editors on supported websites.</p>
    <p>Currently, NativeType supports composing posts, replies, and quote posts on X.</p>
    <p>To provide translation functionality, the extension may temporarily access text you enter into a supported composer.</p>
    <p>This access is used to:</p>
    <ul>
      <li>Detect the configured source language.</li>
      <li>Translate text using Chrome's built-in Translator API.</li>
      <li>Display a translation preview.</li>
      <li>Replace the original text when you explicitly choose to do so.</li>
    </ul>
    <p>NativeType does not independently publish posts or messages on your behalf.</p>
    <p>The extension does not use its website access to collect unrelated browsing history or monitor activity outside its supported translation workflows.</p>

    <h2>3. Local Translation Processing</h2>
    <p>NativeType uses Chrome's built-in Translator API and, where necessary, Chrome's Language Detector API.</p>
    <p>Translation and language detection are performed through browser-provided, on-device capabilities.</p>
    <p><strong>NativeType does not upload your original text or translated text to its servers for translation.</strong></p>
    <p>Your drafts and translations are not stored in a NativeType server-side database.</p>
    <p>Text used during translation is handled temporarily as needed to perform the requested operation.</p>
    <p>Chrome may separately download language models, manage browser components, or perform browser-level diagnostics. These processes are controlled by Google Chrome and are subject to Google's applicable privacy policies.</p>
    <p>NativeType does not control Chrome's internal data processing.</p>

    <h2>4. Information Stored Locally</h2>
    <p>NativeType uses Chrome extension storage to save preferences necessary for its operation.</p>
    <p>This may include:</p>
    <ul>
      <li>Your selected source and target languages.</li>
      <li>Translation activation settings for supported composer contexts.</li>
      <li>Your optional usage statistics preference.</li>
      <li>A randomly generated installation identifier, only if you enable usage statistics.</li>
    </ul>
    <p>These preferences are stored locally in your browser.</p>
    <p>NativeType does not save your draft text, translation history, passwords, or account credentials in extension storage.</p>

    <h2>5. Optional Usage Statistics</h2>
    <p>NativeType provides optional usage statistics to help us understand feature usage, measure reliability, and identify areas for improvement.</p>
    <p><strong>Usage statistics are disabled by default, including for existing users upgrading to a version that supports them.</strong></p>
    <p>You can enable or disable statistics through the extension's Settings page under Privacy &amp; Analytics.</p>
    <p>When enabled, NativeType sends the following information to its statistics service:</p>
    <h3>Installation identifier</h3>
    <p>A randomly generated identifier is created when you enable usage statistics. It is not derived from your name, email address, browser account, device hardware, or fingerprint.</p>
    <h3>Usage event</h3>
    <p>One of the following event types:</p>
    <ul>
      <li><code>translation_success</code> — A translation was successfully generated.</li>
      <li><code>replace_success</code> — Translated text was successfully inserted into the composer.</li>
      <li><code>translation_error</code> — A translation operation ended in an error.</li>
    </ul>
    <p>These events are used to measure translation activity and reliability.</p>
    <p>Statistics reports do not include:</p>
    <ul>
      <li>Original or translated text.</li>
      <li>Website URLs or page titles.</li>
      <li>Your X account information.</li>
      <li>Names, email addresses, or passwords.</li>
      <li>Language-detection input.</li>
      <li>Error messages, stack traces, or draft content.</li>
    </ul>
    <p>The extension does not use third-party advertising analytics SDKs to collect these events.</p>
    <p><strong>These statistics are pseudonymous, not completely anonymous.</strong> Events associated with the same installation identifier can be linked for statistical purposes.</p>

    <h2>6. Statistics Storage and Retention</h2>
    <p>NativeType uses Cloudflare infrastructure and Cloudflare D1 to process and store optional usage statistics.</p>
    <p>When a statistics event is received, the installation identifier is processed into a keyed cryptographic hash.</p>
    <p>The analytics database stores this hashed identifier and daily event counts. It does not retain the original installation identifier or a separate history of individual events.</p>
    <p>Analytics records are designed to be retained for the most recent <strong>90 UTC calendar dates</strong> and removed through scheduled cleanup. Cleanup delays may temporarily extend this period.</p>
    <p>If you disable usage statistics:</p>
    <ul>
      <li>NativeType stops sending new statistics events.</li>
      <li>The locally stored installation identifier is removed.</li>
      <li>Pending statistics requests are canceled where possible.</li>
      <li>Translation functionality remains available.</li>
    </ul>
    <p>Statistics already received by the server are not immediately deleted when you disable reporting. They remain subject to the retention schedule.</p>
    <p>If you enable statistics again, NativeType creates a new random installation identifier.</p>

    <h2>7. Website, API, and Infrastructure Data</h2>
    <p>NativeType operates its website and statistics API using Cloudflare infrastructure.</p>
    <p>When you visit our website or your browser connects to our API, Cloudflare may process technical information necessary to deliver and protect those services.</p>
    <p>This may include IP addresses, network connection information, HTTP request metadata, and browser-related technical information.</p>
    <p>Such information may be processed for network delivery, security, abuse prevention, and infrastructure operations.</p>
    <p>NativeType does not store IP addresses or User-Agent strings as fields in its D1 usage statistics database.</p>
    <p>Cloudflare's handling of network-level information is described in its privacy policy:</p>
    <p><a href="https://www.cloudflare.com/policies/privacy/" target="_blank" rel="noopener noreferrer">https://www.cloudflare.com/policies/privacy/</a></p>

    <h2>8. Public Usage Statistics</h2>
    <p>NativeType may display aggregated usage statistics on its official website.</p>
    <p>These statistics may include participating installations, successful translations, and successful text replacements.</p>
    <p>Public statistics are intended to reflect aggregate product usage.</p>
    <p>They do not include installation identifiers, individual event records, writing content, account information, or other installation-level details.</p>
    <p>Statistics derived from opt-in reporting represent participating installations, not necessarily all NativeType users.</p>

    <h2>9. Data Sharing and Sale</h2>
    <p>NativeType does not sell personal information.</p>
    <p>We do not share your writing or optional usage statistics with advertising networks, data brokers, or third parties for behavioral advertising.</p>
    <p>Cloudflare provides infrastructure services for hosting and processing our website and statistics API.</p>
    <p>Google Chrome independently provides the browser capabilities used for local translation and language detection.</p>
    <p>We use information only for the purposes described in this policy and do not use extension data for unrelated profiling, credit assessment, or advertising.</p>

    <h2>10. Data Security</h2>
    <p>NativeType is designed to minimize unnecessary data collection.</p>
    <p>We use on-device translation, limited statistics payloads, HTTPS transmission, and keyed hashing of installation identifiers in server-side analytics records.</p>
    <p>Access to infrastructure and stored data is restricted to authorized administration and operational purposes.</p>
    <p>Although we take reasonable measures to protect data, no software or online service can guarantee absolute security.</p>

    <h2>11. Your Choices and Privacy Rights</h2>
    <p>You remain in control of optional usage statistics.</p>
    <p>You may disable statistics at any time in NativeType Settings without losing the extension's translation functionality.</p>
    <p>You can also remove locally stored extension information by uninstalling NativeType, subject to Chrome's storage behavior.</p>
    <p>Depending on your location and applicable privacy laws, you may have rights relating to access, correction, deletion, or other processing of personal information.</p>
    <p>You may contact us about these rights using the contact information below.</p>
    <p>Because NativeType does not maintain user accounts and its server-side statistics are pseudonymized and aggregated by day, we may not always be able to identify historical records associated with a particular individual.</p>

    <h2>12. Children's Privacy</h2>
    <p>NativeType is a general-purpose productivity tool and is not specifically designed for children.</p>
    <p>We do not knowingly collect personal information from children.</p>
    <p>If you believe information has been collected from a child inappropriately, please contact us.</p>

    <h2>13. Changes to This Privacy Policy</h2>
    <p>We may update this Privacy Policy when our functionality, permissions, infrastructure, or data practices change.</p>
    <p>Updates will be published on this page with a revised date.</p>
    <p>Where required, material changes to data collection or processing will also be disclosed through appropriate extension or store communications before the changed practices take effect.</p>

    <h2>14. Contact</h2>
    <p>NativeType is an open-source project.</p>
    <p>For privacy questions, feedback, or concerns, please contact the project maintainers through GitHub:</p>
    <p><a :href="issuesUrl" target="_blank" rel="noopener noreferrer">https://github.com/webszy/NativeType/issues</a></p>
    <p>Please do not include passwords, private drafts, or other sensitive personal information in public GitHub issues.</p>
    <p><strong>Official website:</strong> <a href="https://typewith.si">https://typewith.si</a></p>

    <hr>
    <p class="policy-end">© 2026 NativeType. All rights reserved.</p>
  </article>
</template>
