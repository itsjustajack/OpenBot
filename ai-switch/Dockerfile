# The AI switch: online AI first, the AI on this computer when the internet is gone. See switch.ts.
FROM oven/bun:1.2-alpine
WORKDIR /app
COPY switch.ts .
EXPOSE 4320
CMD ["bun", "switch.ts"]
