import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ManifestTest() {
  const [manifestStatus, setManifestStatus] = useState<string>("Not checked");
  const [error, setError] = useState<string | null>(null);
  const [filesStatus, setFilesStatus] = useState<Record<string, string>>({});

  const checkManifest = async () => {
    try {
      setManifestStatus("Checking...");
      setError(null);

      // Check manifest file
      const manifestResponse = await fetch(
        "http://localhost:5174/tonconnect-manifest.json"
      );
      if (manifestResponse.ok) {
        const manifest = await manifestResponse.json();
        setManifestStatus(`Success! Manifest loaded: ${manifest.name}`);
      } else {
        setManifestStatus(
          `Error: ${manifestResponse.status} ${manifestResponse.statusText}`
        );
        setError(
          `Failed to load manifest: ${manifestResponse.status} ${manifestResponse.statusText}`
        );
      }
    } catch (err) {
      setManifestStatus("Error occurred");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const checkAllFiles = async () => {
    const files = [
      "http://localhost:5174/tonconnect-manifest.json",
      "http://localhost:5174/logo.png",
      "http://localhost:5174/terms.html",
      "http://localhost:5174/privacy.html",
    ];

    const status: Record<string, string> = {};

    for (const file of files) {
      try {
        const response = await fetch(file);
        status[file] = response.ok
          ? `OK (${response.status})`
          : `Error (${response.status})`;
      } catch (err) {
        status[file] = `Error: ${
          err instanceof Error ? err.message : "Unknown error"
        }`;
      }
    }

    setFilesStatus(status);
  };

  const testManifestValidation = async () => {
    try {
      setManifestStatus("Testing manifest validation...");
      setError(null);

      // Try to validate the manifest by making a request to a TON Connect endpoint
      // This is a simulation - in reality, the wallet would do this validation
      const manifestResponse = await fetch(
        "http://localhost:5174/tonconnect-manifest.json"
      );
      if (manifestResponse.ok) {
        const manifest = await manifestResponse.json();

        // Check if all required fields are present
        const requiredFields = ["url", "name", "iconUrl"];
        const missingFields = requiredFields.filter(
          (field) => !manifest[field]
        );

        if (missingFields.length > 0) {
          setManifestStatus(
            `Validation failed: Missing fields: ${missingFields.join(", ")}`
          );
          setError(`Manifest validation failed: Missing required fields`);
          return;
        }

        // Check if URLs are accessible
        const urlsToCheck = [
          manifest.iconUrl,
          manifest.termsOfUseUrl,
          manifest.privacyPolicyUrl,
        ].filter((url) => url); // Filter out undefined URLs

        for (const url of urlsToCheck) {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              setManifestStatus(
                `Validation warning: URL not accessible: ${url}`
              );
              setError(`URL not accessible: ${url} (${response.status})`);
              return;
            }
          } catch (err) {
            setManifestStatus(`Validation warning: URL not accessible: ${url}`);
            setError(
              `URL not accessible: ${url} (${
                err instanceof Error ? err.message : "Unknown error"
              })`
            );
            return;
          }
        }

        setManifestStatus(
          `Validation passed! All required fields present and URLs accessible`
        );
      } else {
        setManifestStatus(
          `Validation failed: Cannot load manifest (${manifestResponse.status})`
        );
        setError(
          `Manifest not accessible: ${manifestResponse.status} ${manifestResponse.statusText}`
        );
      }
    } catch (err) {
      setManifestStatus("Validation error occurred");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Manifest Test</h1>
        <p className="text-muted-foreground">
          Test if the TON Connect manifest and related files are accessible
        </p>
      </div>

      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">Manifest Status</h3>
            <p className="text-sm">{manifestStatus}</p>
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">Files Status</h3>
            {Object.keys(filesStatus).length > 0 ? (
              <ul className="text-sm space-y-1">
                {Object.entries(filesStatus).map(([file, status]) => (
                  <li key={file} className="flex justify-between">
                    <span className="truncate mr-2">
                      {file.replace("http://localhost:5174/", "")}:
                    </span>
                    <span
                      className={
                        status.includes("OK")
                          ? "text-green-500"
                          : "text-red-500"
                      }
                    >
                      {status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm">
                Click "Check All Files" to test accessibility
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={checkManifest}>Check Manifest</Button>
            <Button onClick={checkAllFiles} variant="secondary">
              Check All Files
            </Button>
            <Button onClick={testManifestValidation} variant="outline">
              Validate Manifest
            </Button>
          </div>

          <div className="mt-6">
            <h3 className="font-medium mb-2">Troubleshooting Steps</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>
                Make sure you're accessing the app through http://localhost:5174
              </li>
              <li>
                Check that all required files exist in the public directory
              </li>
              <li>Try clearing your browser cache and cookies</li>
              <li>Try using an incognito/private browsing window</li>
              <li>Make sure your firewall isn't blocking the connection</li>
              <li>Verify that the manifest file has the correct JSON format</li>
              <li>Ensure all URLs in the manifest are accessible</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}