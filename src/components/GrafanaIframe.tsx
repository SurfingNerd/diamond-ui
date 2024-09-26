import React from 'react';
// require("dotenv").config();

const GrafanaIframe = () => {
  // If you have an authentication token:
  const authToken = 'glsa_Dh69IA96CokHIJoX0I4s7xIfTG6dvjVv_3ef1047d';

  // If you don't have an authentication token:
  // const username = 'YOUR_USERNAME';
  // const password = 'YOUR_PASSWORD';

  const grafanaURL = 'http://38.242.206.145:3000/d-solo/b9098ac5-1b39-4593-ac24-9849950b9dd9/validators?orgId=1&from=1694271168913&to=1694275980137&panelId=7';

  // Construct the URL with credentials (use either authToken or username/password)
  const iframeURL = `${grafanaURL}?orgId=1&from=now-1h&to=now&kiosk=tv&auth_token=${authToken}`;

  return (
    <iframe
      title="Grafana Embed"
      width="100%"
      height="600"
      src={iframeURL}
    //   frameBorder="0"
      // If using an authentication token, pass it in the HTTP request headers.
      // You may need to adjust the header based on your Grafana setup.
      // For basic authentication, pass the credentials in the URL (less secure).
    //   headers={{
    //     Authorization: `Bearer ${authToken}`,
    //   }}
    />
  );
};

export default GrafanaIframe;
