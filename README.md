# README

## 프로젝트 명령어

### 데이터베이스 컨테이너 구성

```sh
docker compose up -d
```

### 프로젝트 실행

```sh
bun dev
bun run dev
bunx --bun drizzle-kit push
```

### 환경변수 설정

```.env
DATABASE_URL=postgresql://pdffer:pdffer@localhost:5411/pdffer
```

## 기타 설정

### biome formatter

### 전체 포매팅

```sh
bunx --bun biome format --write .
```

### 포매팅 설정 변경

`@/biome.json` 에서 변경
