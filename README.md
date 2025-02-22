# README

## 프로젝트 명령어

### 데이터베이스 컨테이너 구성

```sh
docker-compose up -d
```

> Rancher Desktop이나 OrbStack, Docker Desktop 등의 GUI 혹은 docker-engine + docker-compose 가 설치되어 있어야 함
> DB를 어떻게 구성할지는 목적에 따라 정할 것. 편의상 도커 컨테이너로 구성할 수 있게 해뒀음.

### 프로젝트 셋업 및 실행

```sh
# 의존성 설치
bun i

# 드리즐 모델을 데이터베이스에 적용
bunx --bun drizzle-kit push

# 개발서버 실행
bun dev

# 프로덕션 빌드
bun build

# 프로덕션 서버 실행
bun start
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

`@/biome.json` 에서 변경하면 됨.
